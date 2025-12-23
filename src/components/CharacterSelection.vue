<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { Color, DoubleSide, ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'
import gsap from 'gsap'
import GLTFModelWithEvents from './GLTFModelWithEvents.vue'

interface Character {
  id: number
  name: string
  modelPath: string
  instruments: string[]
  influences: string[]
  favoriteSong: string
}

type BGStyleKey = 'selected' | 'unselected'

type MaterialStyle = {
  opacity: number
}

const bgStyleByState: Record<BGStyleKey, MaterialStyle> = {
  selected: { opacity: 1 },
  unselected: { opacity: 0.35 },
}

const characters = ref<Character[]>([
  {
    id: 1,
    name: 'Edgar',
    modelPath: new URL('../assets/threed/monster1.glb', import.meta.url).href,
    instruments: ['Guitar', 'Backing Vocals'],
    influences: ['Led Zeppelin', 'Beatles'],
    favoriteSong: 'Tears of Joyful Despair',
  },
  {
    id: 2,
    name: 'Cami',
    modelPath: new URL('../assets/threed/monster2.glb', import.meta.url).href,
    instruments: ['Singer', 'Flute'],
    influences: ['Beatles', 'Joni Mitchell'],
    favoriteSong: 'Witch Hunting',
  },
  {
    id: 3,
    name: 'Steff',
    modelPath: new URL('../assets/threed/monster3.glb', import.meta.url).href,
    instruments: ['Drums'],
    influences: ['Led Zeppelin', 'Pink Floyd'],
    favoriteSong: 'Étiquette',
  },
  {
    id: 4,
    name: 'Tobi',
    modelPath: new URL('../assets/threed/monster4.glb', import.meta.url).href,
    instruments: ['Bass'],
    influences: ['Red Hot Chili Peppers', 'Jimi Hendrix'],
    favoriteSong: 'Misled',
  },
])

const selectedIndex = ref<number>(0)
const rotationAngle = ref<number>(0)
const isAnimating = ref<boolean>(false)

// --- Option B: single canvas, background-only blur via postprocessing + layers ---
const BG_LAYER = 0
const SELECTED_LAYER = 1
const BG_BLUR_PX = 3

// Track loaded model roots so we can update layers/materials when selection changes
const modelRootsById = new Map<number, unknown>()

// Tres context & postprocessing composer for the background layer
const tresCtx = shallowRef<unknown | null>(null)
const bgComposer = shallowRef<unknown | null>(null)
const blurHPass = shallowRef<unknown | null>(null)
const blurVPass = shallowRef<unknown | null>(null)

type LayersLike = { set: (layer: number) => void; enableAll?: () => void }
type TraversableLike = { traverse: (visitor: (node: unknown) => void) => void }
type Object3DLike = { layers?: LayersLike } & Partial<TraversableLike>
type MeshLike = { isMesh?: boolean; material?: unknown; layers?: LayersLike }
type MaterialLike = {
  transparent?: boolean
  opacity?: number
  depthWrite?: boolean
  needsUpdate?: boolean
}
type RendererLike = {
  domElement?: { clientWidth?: number; clientHeight?: number; width?: number; height?: number }
  autoClear?: boolean
  getRenderTarget?: () => unknown
  setRenderTarget?: (target: unknown) => void
  getScissorTest?: () => boolean
  setScissorTest?: (enabled: boolean) => void
  setViewport?: (x: number, y: number, width: number, height: number) => void
  getPixelRatio?: () => number
  render: (scene: unknown, camera: unknown) => void
  clear: () => void
  clearDepth: () => void
}
type CameraLike = { layers: LayersLike }
type ComposerLike = { render: () => void; setSize?: (width: number, height: number) => void }
type BlurPassLike = { uniforms: { h?: { value: number }; v?: { value: number } } }

type RefLike<T> = { value: T }
type SizesLike = { width?: RefLike<number>; height?: RefLike<number> }
type RendererManagerLike = { instance?: unknown }
type CameraManagerLike = { activeCamera?: RefLike<unknown> }
type TresCtxLike = {
  renderer?: RendererManagerLike
  scene?: RefLike<unknown>
  camera?: CameraManagerLike
  sizes?: SizesLike
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object'

const unwrap = (v: unknown): unknown =>
  isObject(v) && 'value' in v ? (v as { value: unknown }).value : v

const getCtxRenderer = (ctx: unknown): RendererLike | null => {
  if (!ctx || !isObject(ctx)) return null
  const manager = (ctx as TresCtxLike).renderer
  const instance = manager?.instance
  return instance && isObject(instance) ? (instance as unknown as RendererLike) : null
}

const getCtxScene = (ctx: unknown): unknown | null => {
  if (!ctx || !isObject(ctx)) return null
  return unwrap((ctx as TresCtxLike).scene) ?? null
}

const getCtxCamera = (ctx: unknown): CameraLike | null => {
  if (!ctx || !isObject(ctx)) return null
  const cam = (ctx as TresCtxLike).camera?.activeCamera
  const instance = unwrap(cam)
  return instance && isObject(instance) ? (instance as unknown as CameraLike) : null
}

const getCtxSize = (ctx: unknown): { width: number; height: number } | null => {
  if (!ctx || !isObject(ctx)) return null
  const sizes = (ctx as TresCtxLike).sizes
  const width = sizes?.width?.value
  const height = sizes?.height?.value
  if (typeof width === 'number' && typeof height === 'number') return { width, height }
  return null
}

const setObjectLayerDeep = (root: unknown, layer: number) => {
  if (!root || !isObject(root)) return

  const maybeTraversable = root as unknown as Object3DLike
  if (typeof maybeTraversable.traverse === 'function') {
    maybeTraversable.traverse((node) => {
      if (!node || !isObject(node)) return
      const layers = (node as unknown as Object3DLike).layers
      if (layers?.set) layers.set(layer)
    })
    return
  }

  const layers = maybeTraversable.layers
  if (layers?.set) layers.set(layer)
}

const applyMaterialBGStyle = (root: unknown, styleKey: BGStyleKey) => {
  const style = bgStyleByState[styleKey]
  if (!root || !isObject(root)) return

  const maybeTraversable = root as unknown as Object3DLike
  if (typeof maybeTraversable.traverse !== 'function') return

  maybeTraversable.traverse((node) => {
    if (!node || !isObject(node)) return

    const mesh = node as unknown as MeshLike
    if (!mesh.isMesh) return

    const rawMaterial = mesh.material
    const materials = Array.isArray(rawMaterial) ? rawMaterial : [rawMaterial]

    for (const maybeMaterial of materials) {
      if (!maybeMaterial || !isObject(maybeMaterial)) continue
      const mat = maybeMaterial as unknown as MaterialLike

      mat.transparent = style.opacity < 1
      mat.opacity = style.opacity
      // Avoid background transparent meshes writing depth and blocking the selected mesh
      mat.depthWrite = style.opacity >= 1
      mat.needsUpdate = true
    }
  })
}

const applySelectionStateToAllModels = () => {
  const selectedId = characters.value[selectedIndex.value]?.id
  if (selectedId == null) return

  for (const [characterId, root] of modelRootsById.entries()) {
    const isSelected = characterId === selectedId
    setObjectLayerDeep(root, isSelected ? SELECTED_LAYER : BG_LAYER)
    applyMaterialBGStyle(root, isSelected ? 'selected' : 'unselected')
  }
}

const updateBlurUniforms = () => {
  const ctx = tresCtx.value
  const composer = bgComposer.value as ComposerLike | null
  const hPass = blurHPass.value as BlurPassLike | null
  const vPass = blurVPass.value as BlurPassLike | null
  if (!ctx || !composer || !hPass || !vPass) return

  const renderer = getCtxRenderer(ctx)
  const size = getCtxSize(ctx)
  const width = size?.width ?? renderer?.domElement?.clientWidth ?? renderer?.domElement?.width ?? 1
  const height =
    size?.height ?? renderer?.domElement?.clientHeight ?? renderer?.domElement?.height ?? 1

  if (composer.setSize) composer.setSize(width, height)
  if (hPass.uniforms.h) hPass.uniforms.h.value = BG_BLUR_PX / Math.max(1, width)
  if (vPass.uniforms.v) vPass.uniforms.v.value = BG_BLUR_PX / Math.max(1, height)
}

const onTresReady = async (ctx: unknown) => {
  tresCtx.value = ctx

  const renderer = getCtxRenderer(ctx)
  const scene = getCtxScene(ctx)
  const camera = getCtxCamera(ctx)

  if (!renderer || !scene || !camera) return

  // Lazy-load postprocessing modules so unit tests (which mock `three`) don't explode.
  const [
    { EffectComposer },
    { RenderPass },
    { ShaderPass },
    { HorizontalBlurShader },
    { VerticalBlurShader },
  ] = await Promise.all([
    import('three/examples/jsm/postprocessing/EffectComposer.js'),
    import('three/examples/jsm/postprocessing/RenderPass.js'),
    import('three/examples/jsm/postprocessing/ShaderPass.js'),
    import('three/examples/jsm/shaders/HorizontalBlurShader.js'),
    import('three/examples/jsm/shaders/VerticalBlurShader.js'),
  ])

  type EffectComposerCtor = new (renderer: RendererLike) => {
    renderToScreen: boolean
    addPass: (pass: unknown) => void
    render: () => void
  }
  type RenderPassCtor = new (scene: unknown, camera: unknown) => unknown
  type ShaderPassCtor = new (shader: unknown) => BlurPassLike

  const composer = new (EffectComposer as unknown as EffectComposerCtor)(renderer)
  composer.renderToScreen = true
  composer.addPass(new (RenderPass as unknown as RenderPassCtor)(scene, camera))

  const hPass = new (ShaderPass as unknown as ShaderPassCtor)(HorizontalBlurShader)
  const vPass = new (ShaderPass as unknown as ShaderPassCtor)(VerticalBlurShader)
  // Some three versions can be picky about which pass renders to screen.
  if (isObject(vPass) && 'renderToScreen' in vPass) {
    ;(vPass as unknown as { renderToScreen: boolean }).renderToScreen = true
  }
  composer.addPass(hPass)
  composer.addPass(vPass)

  bgComposer.value = composer
  blurHPass.value = hPass
  blurVPass.value = vPass

  updateBlurUniforms()
  applySelectionStateToAllModels()
}

const onTresLoop = () => {
  const ctx = tresCtx.value
  const composer = bgComposer.value as ComposerLike | null
  if (!ctx) return

  const renderer = getCtxRenderer(ctx)
  const scene = getCtxScene(ctx)
  const camera = getCtxCamera(ctx)
  if (!renderer || !scene || !camera) return

  // In renderMode='always', Tres has already rendered the frame before emitting `loop`.
  // If postprocessing or models aren't ready yet, don't clear/re-render — it can blank the output.
  if (!composer) return
  if (modelRootsById.size === 0) return

  updateBlurUniforms()

  // Save renderer state that postprocessing may change
  const prevRenderTarget = renderer.getRenderTarget ? renderer.getRenderTarget() : null
  const prevScissorTest = renderer.getScissorTest ? renderer.getScissorTest() : null

  const prevAutoClear = renderer.autoClear
  renderer.autoClear = false
  renderer.clear()

  // 1) background layer blurred
  camera.layers.set(BG_LAYER)
  composer.render()

  // Composer can leave the renderer bound to an internal render target;
  // ensure we render the selected layer to the actual screen.
  if (renderer.setRenderTarget) renderer.setRenderTarget(null)
  if (renderer.setScissorTest && prevScissorTest != null) renderer.setScissorTest(prevScissorTest)
  if (renderer.setViewport) {
    const size = getCtxSize(ctx)
    const width = size?.width ?? renderer.domElement?.clientWidth ?? renderer.domElement?.width ?? 1
    const height =
      size?.height ?? renderer.domElement?.clientHeight ?? renderer.domElement?.height ?? 1
    renderer.setViewport(0, 0, width, height)
  }

  // 2) selected layer normal on top
  renderer.clearDepth()
  camera.layers.set(SELECTED_LAYER)
  renderer.render(scene, camera)

  // Restore state so Tres' internal renderer isn't affected next frame
  if (camera.layers.enableAll) camera.layers.enableAll()
  renderer.autoClear = prevAutoClear

  // Restore any render target Tres might have been using (usually null)
  if (renderer.setRenderTarget) renderer.setRenderTarget(prevRenderTarget)
}

// Circular positioning parameters
const radius = 2.5
const angleStep = (Math.PI * 2) / characters.value.length

const selectedCharacter = computed(() => characters.value[selectedIndex.value])

// Calculate position for each character in the circle
const getCharacterPosition = (index: number, currentRotation: number): [number, number, number] => {
  const angle = index * angleStep + currentRotation
  return [Math.sin(angle) * radius, 0, Math.cos(angle) * radius]
}

// Calculate rotation so character faces the camera (XZ plane)
const cameraXZ = { x: 0, z: 10 }
const modelYawOffset = 0

const getCharacterRotation = (index: number, groupRotation: number): [number, number, number] => {
  const worldAngle = index * angleStep + groupRotation
  const x = Math.sin(worldAngle) * radius
  const z = Math.cos(worldAngle) * radius

  const dx = cameraXZ.x - x
  const dz = cameraXZ.z - z

  // Yaw that would face the camera in world space
  const worldYaw = Math.atan2(dx, dz) + modelYawOffset

  // Compensate for the parent group's rotation so the model ends up with worldYaw
  const localYaw = worldYaw - groupRotation

  return [0, localYaw, 0]
}

const extractRootFromModelLoad = (payload: unknown): unknown => {
  if (!payload) return null

  // Common: GLTF { scene: Object3D }
  if (isObject(payload) && 'scene' in payload) {
    return (payload as { scene?: unknown }).scene ?? payload
  }

  // Some wrappers emit { model: Object3D } or { value: GLTF }
  if (isObject(payload) && 'model' in payload) {
    return (payload as { model?: unknown }).model ?? payload
  }
  if (isObject(payload) && 'value' in payload) {
    return extractRootFromModelLoad((payload as { value?: unknown }).value)
  }

  return payload
}

const onModelLoaded = (characterId: number, payload: unknown) => {
  const root = extractRootFromModelLoad(payload)
  if (!root) return
  modelRootsById.set(characterId, root)
  applySelectionStateToAllModels()
}

const onModelError = (characterId: number, error: unknown) => {
  if (import.meta.env.MODE === 'test') return

  console.error('[CharacterSelection] GLTF load failed', { characterId, error })
}

watch(selectedIndex, () => {
  applySelectionStateToAllModels()
})

// Navigate to next character (clockwise)
const nextCharacter = () => {
  if (isAnimating.value) return
  isAnimating.value = true

  selectedIndex.value = (selectedIndex.value + 1) % characters.value.length
  const targetRotation = rotationAngle.value - angleStep

  gsap.to(
    { value: rotationAngle.value },
    {
      value: targetRotation,
      duration: 0.8,
      ease: 'power3.inOut',
      onUpdate: function () {
        rotationAngle.value = this.targets()[0].value
      },
      onComplete: () => {
        isAnimating.value = false
      },
    }
  )
}

// Navigate to previous character (counterclockwise)
const prevCharacter = () => {
  if (isAnimating.value) return
  isAnimating.value = true

  selectedIndex.value =
    (selectedIndex.value - 1 + characters.value.length) % characters.value.length
  const targetRotation = rotationAngle.value + angleStep

  gsap.to(
    { value: rotationAngle.value },
    {
      value: targetRotation,
      duration: 0.8,
      ease: 'power3.inOut',
      onUpdate: function () {
        rotationAngle.value = this.targets()[0].value
      },
      onComplete: () => {
        isAnimating.value = false
      },
    }
  )
}

const gl = {
  // Explicit clear alpha to prevent black WebGL clear background
  clearColor: '#000000',
  clearAlpha: 0,
  shadows: true,
  alpha: true,
  premultipliedAlpha: false,
  shadowMapType: PCFSoftShadowMap,
  outputColorSpace: SRGBColorSpace,
  toneMapping: ACESFilmicToneMapping,
  toneMappingExposure: 1.2,
}

// Touch/Swipe support
const touchStartX = ref<number>(0)
const touchEndX = ref<number>(0)
const minSwipeDistance = 50

const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0]?.clientX || 0
}

const handleTouchMove = (e: TouchEvent) => {
  touchEndX.value = e.touches[0]?.clientX || 0
}

const handleTouchEnd = () => {
  if (!touchStartX.value || !touchEndX.value) return

  const distance = touchStartX.value - touchEndX.value
  const isLeftSwipe = distance > minSwipeDistance
  const isRightSwipe = distance < -minSwipeDistance

  if (isLeftSwipe) {
    nextCharacter()
  } else if (isRightSwipe) {
    prevCharacter()
  }

  touchStartX.value = 0
  touchEndX.value = 0
}

const sceneRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (sceneRef.value) {
    sceneRef.value.addEventListener('touchstart', handleTouchStart, { passive: true })
    sceneRef.value.addEventListener('touchmove', handleTouchMove, { passive: true })
    sceneRef.value.addEventListener('touchend', handleTouchEnd)
  }
})

onUnmounted(() => {
  if (sceneRef.value) {
    sceneRef.value.removeEventListener('touchstart', handleTouchStart)
    sceneRef.value.removeEventListener('touchmove', handleTouchMove)
    sceneRef.value.removeEventListener('touchend', handleTouchEnd)
  }
})
</script>

<template>
  <div class="character-selection">
    <!-- 3D Scene -->
    <div ref="sceneRef" class="character-selection__scene">
      <TresCanvas v-bind="gl" render-mode="always" @ready="onTresReady" @loop="onTresLoop">
        <TresPerspectiveCamera :position="[0, 2.6, 10]" :fov="45" />

        <!-- Lighting -->
        <TresAmbientLight :intensity="0.4" />
        <TresDirectionalLight
          :position="[5, 10, 5]"
          :intensity="1.5"
          cast-shadow
          :shadow-mapSize-width="2048"
          :shadow-mapSize-height="2048"
        />
        <TresPointLight :position="[0, 5, 0]" :intensity="0.6" color="#ffffff" />

        <!-- Characters in circular formation -->
        <TresGroup :rotation="[0, rotationAngle, 0]">
          <!-- Circular path indicator -->
          <TresMesh :position="[0, 0.02, 0]" :rotation="[-Math.PI / 2, 0, 0]">
            <TresRingGeometry :args="[radius - 0.2, radius + 0.2, 128]" />
            <TresMeshBasicMaterial :color="new Color(0xffeb3b)" :opacity="0.15" transparent />
          </TresMesh>

          <template v-for="(character, index) in characters" :key="character.id">
            <!-- Character Model with rotation to face camera -->
            <GLTFModelWithEvents
              :path="character.modelPath"
              cast-shadow
              receive-shadow
              :position="getCharacterPosition(index, 0)"
              :rotation="getCharacterRotation(index, rotationAngle)"
              :scale="index === selectedIndex ? 2 : 1.3"
              @loaded="(payload) => onModelLoaded(character.id, payload)"
              @error="(err) => onModelError(character.id, err)"
            />

            <!-- Ground Circle for Character -->
            <TresMesh
              :position="[
                getCharacterPosition(index, 0)[0],
                -0.01,
                getCharacterPosition(index, 0)[2],
              ]"
              :rotation="[-Math.PI / 2, 0, 0]"
              receive-shadow
            >
              <TresCircleGeometry :args="[1.2, 64]" />
              <TresMeshStandardMaterial
                v-if="index === selectedIndex"
                :color="new Color(0xffeb3b)"
                :emissive="new Color(0xffeb3b)"
                :emissiveIntensity="0.6"
                :metalness="0.8"
                :roughness="0.2"
              />
              <TresMeshStandardMaterial
                v-else
                :color="new Color(0x0a0a0a)"
                :metalness="0.1"
                :roughness="0.9"
                :opacity="0.4"
                transparent
              />
            </TresMesh>

            <!-- Halo Ring for Selected Character -->
            <template v-if="index === selectedIndex">
              <TresMesh
                :position="[
                  getCharacterPosition(index, 0)[0],
                  0.1,
                  getCharacterPosition(index, 0)[2],
                ]"
                :rotation="[-Math.PI / 2, 0, 0]"
              >
                <TresRingGeometry :args="[1.3, 1.6, 64]" />
                <TresMeshBasicMaterial
                  :color="new Color(0xffeb3b)"
                  :opacity="0.9"
                  transparent
                  :side="DoubleSide"
                />
              </TresMesh>
            </template>

            <!-- Shadow overlay for unselected characters (ground shadow, avoids camera-facing black disc) -->
            <template v-if="index !== selectedIndex">
              <TresMesh
                :position="[
                  getCharacterPosition(index, 0)[0],
                  0.025,
                  getCharacterPosition(index, 0)[2],
                ]"
                :rotation="[-Math.PI / 2, 0, 0]"
              >
                <TresCircleGeometry :args="[2.1, 64]" />
                <TresMeshBasicMaterial :color="new Color(0x000000)" :opacity="0.22" transparent />
              </TresMesh>
            </template>
          </template>
        </TresGroup>

        <!-- Ground Plane -->
        <TresMesh :position="[0, -0.02, 0]" :rotation="[-Math.PI / 2, 0, 0]" receive-shadow>
          <TresPlaneGeometry :args="[25, 25]" />
          <!-- Shadow-only: keeps depth without painting a black floor -->
          <TresShadowMaterial :opacity="0.18" />
        </TresMesh>

        <!-- Camera Controls - disabled rotation for fixed view -->
        <OrbitControls
          :enableRotate="false"
          :enablePan="false"
          :enableZoom="true"
          :minDistance="8"
          :maxDistance="15"
        />
      </TresCanvas>
    </div>

    <!-- Navigation Arrows -->
    <button
      class="character-selection__arrow character-selection__arrow--left"
      @click="prevCharacter"
      :disabled="isAnimating"
      aria-label="Previous character"
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 18L9 12L15 6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <button
      class="character-selection__arrow character-selection__arrow--right"
      @click="nextCharacter"
      :disabled="isAnimating"
      aria-label="Next character"
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 18L15 12L9 6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <!-- Character Details Panel (RPG-style card) -->
    <div class="character-selection__details" v-if="selectedCharacter">
      <div class="character-selection__card">
        <!-- Character Portrait Placeholder -->
        <div class="character-selection__portrait">
          <div class="character-selection__portrait-inner">
            {{ selectedCharacter.name.charAt(0) }}
          </div>
        </div>

        <div class="character-selection__card-content">
          <h3 class="character-selection__card-title">{{ selectedCharacter.name }}</h3>

          <div class="character-selection__info-section">
            <h4 class="character-selection__section-title">Role</h4>
            <ul class="character-selection__info-list">
              <li v-for="instrument in selectedCharacter.instruments" :key="instrument">
                {{ instrument }}
              </li>
            </ul>
          </div>

          <div class="character-selection__info-section">
            <h4 class="character-selection__section-title">Influences</h4>
            <ul class="character-selection__info-list">
              <li v-for="influence in selectedCharacter.influences" :key="influence">
                {{ influence }}
              </li>
            </ul>
          </div>

          <div class="character-selection__info-section">
            <h4 class="character-selection__section-title">Favorite Song</h4>
            <p class="character-selection__favorite-song">{{ selectedCharacter.favoriteSong }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./characterSelection/CharacterSelection.css"></style>
