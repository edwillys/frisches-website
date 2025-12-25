<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, shallowRef } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { PCFSoftShadowMap, SRGBColorSpace, ACESFilmicToneMapping, Vector3, Cache } from 'three'
import type { AnimationClip, Object3D } from 'three'
import gsap from 'gsap'
import GLTFModelWithEvents from './GLTFModelWithEvents.vue'

// Enable Three.js cache - this is critical for sharing loaded models across loaders
// Wrapped in try-catch to handle test environments where Cache may not be available
try {
  if (typeof Cache !== 'undefined' && Object.prototype.hasOwnProperty.call(Cache, 'enabled')) {
    ;(Cache as unknown as { enabled?: boolean }).enabled = true
  }
} catch {
  // Silently fail in test environment
  if (import.meta.env.MODE !== 'test') {
    console.warn('Three.js Cache not available, models will not be cached')
  }
}

// Badge SVG imports
import guitarHeadSvg from '@/assets/badges/guitar-head.svg'
import bassHeadSvg from '@/assets/badges/bass-head.svg'
import microphoneSvg from '@/assets/badges/microphone.svg'
import fluteSvg from '@/assets/badges/flute.svg'
import drumSticksSvg from '@/assets/badges/drum-sticks.svg'
import choirSvg from '@/assets/badges/choir.svg'

const badgeMap: Record<string, string> = {
  Guitar: guitarHeadSvg,
  Bass: bassHeadSvg,
  Singer: microphoneSvg,
  Flute: fluteSvg,
  Drums: drumSticksSvg,
  'Backing Vocals': choirSvg,
}

interface Character {
  id: number
  name: string
  modelPath: string
  rotationY?: number
  scale?: number
  instruments: string[]
  influences: string[]
  favoriteSong: string
}

const DEFAULT_SCALE = 2.5
const DEFAULT_ROTATION_Y = 0

const characters = ref<Character[]>([
  {
    id: 1,
    name: 'Edgar',
    modelPath: new URL('../assets/private/threed/monster1.glb', import.meta.url).href,
    //rotationY: DEFAULT_ROTATION_Y,
    //scale: DEFAULT_SCALE,
    instruments: ['Guitar', 'Backing Vocals'],
    influences: ['Led Zeppelin', 'Beatles'],
    favoriteSong: 'Tears of Joyful Despair',
  },
  {
    id: 2,
    name: 'Cami',
    modelPath: new URL('../assets/private/threed/monster2.glb', import.meta.url).href,
    //rotationY: DEFAULT_ROTATION_Y,
    //scale: DEFAULT_SCALE,
    instruments: ['Singer', 'Flute'],
    influences: ['Beatles', 'Joni Mitchell'],
    favoriteSong: 'Witch Hunting',
  },
  {
    id: 3,
    name: 'Steff',
    modelPath: new URL('../assets/private/threed/monster3.glb', import.meta.url).href,
    //rotationY: DEFAULT_ROTATION_Y,
    //scale: DEFAULT_SCALE,
    instruments: ['Drums'],
    influences: ['Led Zeppelin', 'Pink Floyd'],
    favoriteSong: 'Étiquette',
  },
  {
    id: 4,
    name: 'Tobi',
    modelPath: new URL('../assets/private/threed/monster4.glb', import.meta.url).href,
    //rotationY: DEFAULT_ROTATION_Y,
    //scale: DEFAULT_SCALE,
    instruments: ['Bass'],
    influences: ['Red Hot Chili Peppers', 'Jimi Hendrix'],
    favoriteSong: 'Misled',
  },
])

const selectedIndex = ref<number>(0)
const isAnimating = ref<boolean>(false)

// Auto-rotation state
const isAutoRotating = ref<boolean>(false)
let autoRotationTween: gsap.core.Tween | null = null
const AUTO_ROTATION_DURATION = 3 // seconds for full 360 rotation

// OrbitControls ref for camera reset
const orbitControlsRef = ref<InstanceType<typeof OrbitControls> | null>(null)
const initialCameraPosition = new Vector3(0, 1.2, 5)
const initialTarget = new Vector3(0, 0, 0)

const emit = defineEmits<{
  (e: 'back'): void
}>()

// Navigation Logic
const nextCharacter = () => {
  const nextIndex = (selectedIndex.value + 1) % characters.value.length
  selectCharacter(nextIndex)
}

const prevCharacter = () => {
  const prevIndex = (selectedIndex.value - 1 + characters.value.length) % characters.value.length
  selectCharacter(prevIndex)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('back')
  } else if (e.key === 'ArrowRight') {
    nextCharacter()
  } else if (e.key === 'ArrowLeft') {
    prevCharacter()
  }
}

// Swipe Logic
const touchStartX = ref(0)
const touchEndX = ref(0)

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  if (touch) {
    touchStartX.value = touch.screenX
  }
}

const handleTouchEnd = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  if (touch) {
    touchEndX.value = touch.screenX
    handleSwipe()
  }
}

const handleSwipe = () => {
  const threshold = 50
  if (touchEndX.value < touchStartX.value - threshold) {
    nextCharacter()
  } else if (touchEndX.value > touchStartX.value + threshold) {
    prevCharacter()
  }
}

// Model loading state
const isModelLoading = ref(true)

// Note: Models are preloaded from App.vue via useCharacterPreloader
// The Three.js Cache ensures they're shared across loaders

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('touchstart', handleTouchStart)
  window.addEventListener('touchend', handleTouchEnd)
})

onBeforeUnmount(() => {
  // Hide canvas to prevent WebGL context loss errors during unmounting
  if (modelContainerRef.value) {
    modelContainerRef.value.style.display = 'none'
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchend', handleTouchEnd)

  // Clean up auto-rotation tween
  if (autoRotationTween) {
    autoRotationTween.kill()
    autoRotationTween = null
  }

  // Clean up WebGL context by finding and disposing the canvas
  if (modelContainerRef.value) {
    const canvas = modelContainerRef.value.querySelector('canvas')
    if (canvas) {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (gl) {
        const ext = gl.getExtension('WEBGL_lose_context')
        if (ext) {
          ext.loseContext()
        }
      }
    }
  }
})

// Track loaded models and their animations
interface LoadedModel {
  scene: Object3D
  animations: AnimationClip[]
}
const loadedModels = shallowRef(new Map<number, LoadedModel>())

const selectedCharacter = computed(() => characters.value[selectedIndex.value])

// Stop auto-rotation on user interaction
const stopAutoRotation = () => {
  if (autoRotationTween) {
    autoRotationTween.kill()
    autoRotationTween = null
  }
  isAutoRotating.value = false
}

// Handle user interaction with OrbitControls
const onControlsStart = () => {
  // User started interacting, stop auto-rotation
  stopAutoRotation()
}

// Start 360-degree camera rotation around the model
const startAutoRotation = () => {
  // Access the underlying Three.js OrbitControls via .instance
  const controlsInstance = orbitControlsRef.value?.instance
  if (!controlsInstance) {
    console.log('Auto-rotation: OrbitControls not ready')
    return
  }

  const camera = controlsInstance.object
  const target = controlsInstance.target

  if (!camera || !target) {
    console.log('Auto-rotation: Camera or target not available')
    return
  }

  // Stop any existing auto-rotation
  stopAutoRotation()

  isAutoRotating.value = true
  console.log('Auto-rotation: Starting 360° camera rotation')

  // Calculate the current distance from target for rotation radius
  const currentPos = camera.position.clone()
  const targetPos = target.clone()
  const offset = currentPos.sub(targetPos)
  const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z)
  const startY = camera.position.y
  const startAngle = Math.atan2(offset.x, offset.z)

  // Animate rotation around the Y axis
  const rotationState = { angle: 0 }
  autoRotationTween = gsap.to(rotationState, {
    angle: Math.PI * 2, // Full 360 degrees
    duration: AUTO_ROTATION_DURATION,
    ease: 'power1.inOut',
    onUpdate: () => {
      const newAngle = startAngle + rotationState.angle
      camera.position.x = target.x + Math.sin(newAngle) * radius
      camera.position.z = target.z + Math.cos(newAngle) * radius
      camera.position.y = startY
      controlsInstance.update()
    },
    onComplete: () => {
      isAutoRotating.value = false
      autoRotationTween = null
      console.log('Auto-rotation: Completed')
    },
  })
}

// Reset camera to frontal view
const resetCameraToFrontal = (startRotationAfter = false) => {
  const controlsInstance = orbitControlsRef.value?.instance
  if (controlsInstance) {
    const camera = controlsInstance.object
    const target = controlsInstance.target

    if (camera && target) {
      // Stop any existing auto-rotation first
      stopAutoRotation()

      // Animate camera back to frontal position
      gsap.to(camera.position, {
        x: initialCameraPosition.x,
        y: initialCameraPosition.y,
        z: initialCameraPosition.z,
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: () => controlsInstance.update(),
        onComplete: () => {
          if (startRotationAfter) {
            startAutoRotation()
          }
        },
      })
      gsap.to(target, {
        x: initialTarget.x,
        y: initialTarget.y,
        z: initialTarget.z,
        duration: 0.8,
        ease: 'power2.out',
      })
    }
  }
}

const onModelLoaded = (id: number, payload: { scene: Object3D; animations: AnimationClip[] }) => {
  console.log(`Model loaded for character ${id}`)

  // Only hide loading spinner when the SELECTED character is loaded
  if (id === selectedCharacter.value?.id) {
    isModelLoading.value = false
  }

  if (payload.scene) {
    loadedModels.value.set(id, {
      scene: payload.scene,
      animations: payload.animations,
    })

    if (payload.animations && payload.animations.length > 0) {
      console.log(
        `Character ${id} available animations:`,
        payload.animations.map((a) => a.name)
      )
    } else {
      console.log(`Character ${id} has no embedded animations`)
    }

    // Start automatic 360-degree camera rotation only for selected character
    if (id === selectedCharacter.value?.id) {
      setTimeout(() => {
        startAutoRotation()
      }, 100)
    }
  }
}

const onAnimationStarted = (id: number, animationName: string) => {
  console.log(`Character ${id} started animation: ${animationName}`)
}

// Preload all models
const onModelError = (id: number, error: unknown) => {
  console.error(`Failed to load model for character ${id}:`, error)
  isModelLoading.value = false
}

// Character selection with animation
const selectCharacter = (index: number) => {
  if (isAnimating.value || index === selectedIndex.value) return
  isAnimating.value = true

  // Only show loading if the model isn't already loaded
  const targetCharacter = characters.value[index]
  // Guard against invalid index (TypeScript strict check)
  if (!targetCharacter) {
    isAnimating.value = false
    return
  }
  const isAlreadyLoaded = loadedModels.value.has(targetCharacter.id)
  if (!isAlreadyLoaded) {
    isModelLoading.value = true
  }

  // Stop auto-rotation and reset camera for new character
  stopAutoRotation()
  resetCameraToFrontal(false)

  // Animate card out then in
  const timeline = gsap.timeline({
    onComplete: () => {
      isAnimating.value = false
      // Start auto-rotation for the new character if already loaded
      if (isAlreadyLoaded) {
        setTimeout(() => startAutoRotation(), 100)
      }
    },
  })

  timeline
    .to('.character-selection__card', {
      opacity: 0,
      x: 50,
      duration: 0.3,
      ease: 'power2.in',
    })
    .to(
      '.character-selection__model-container',
      {
        opacity: 0,
        x: -50,
        duration: 0.3,
        ease: 'power2.in',
      },
      '<'
    )
    .call(() => {
      selectedIndex.value = index
    })
    .to('.character-selection__model-container', {
      opacity: 1,
      x: 0,
      duration: 0.4,
      ease: 'power2.out',
    })
    .to(
      '.character-selection__card',
      {
        opacity: 1,
        x: 0,
        duration: 0.4,
        ease: 'power2.out',
      },
      '<'
    )
}

// Optimized WebGL settings for performance
const gl = {
  clearColor: '#000000',
  clearAlpha: 0,
  shadows: false, // Disable shadows for performance
  alpha: true,
  premultipliedAlpha: false,
  shadowMapType: PCFSoftShadowMap,
  outputColorSpace: SRGBColorSpace,
  toneMapping: ACESFilmicToneMapping,
  toneMappingExposure: 1.2,
  // Performance optimizations
  powerPreference: 'high-performance' as const,
  antialias: false, // Disable antialiasing for performance
  // Limit pixel ratio for performance on high-DPI displays
  dpr: Math.min(window.devicePixelRatio, 1.5),
}

const modelContainerRef = ref<HTMLElement | null>(null)
</script>

<template>
  <div class="character-selection">
    <!-- Character and Card Container -->
    <div class="character-selection__content">
      <!-- 3D Character Model -->
      <div ref="modelContainerRef" class="character-selection__model-container">
        <!-- Loading indicator -->
        <div v-if="isModelLoading" class="character-selection__loading">
          <div class="character-selection__loading-spinner"></div>
          <span>Loading...</span>
        </div>

        <TresCanvas v-bind="gl" render-mode="on-demand" :window-size="false">
          <TresPerspectiveCamera :position="[0, 1.2, 5]" :fov="50" />

          <!-- Simplified lighting for performance -->
          <TresAmbientLight :intensity="0.8" />
          <TresDirectionalLight :position="[5, 10, 5]" :intensity="1.0" />

          <!-- Load ALL models once, show/hide based on selection for instant switching -->
          <Suspense>
            <template v-for="character in characters" :key="character.id">
              <GLTFModelWithEvents
                :path="character.modelPath"
                draco
                :auto-play-animation="false"
                :position="[0, -2.2, 0]"
                :rotation="[0, character.rotationY ?? DEFAULT_ROTATION_Y, 0]"
                :scale="DEFAULT_SCALE"
                :visible="character.id === selectedCharacter?.id"
                @loaded="(payload) => onModelLoaded(character.id, payload)"
                @error="(err) => onModelError(character.id, err)"
                @animation-started="(name) => onAnimationStarted(character.id, name)"
              />
            </template>
          </Suspense>

          <OrbitControls
            ref="orbitControlsRef"
            :enableDamping="false"
            :enablePan="false"
            :enableZoom="true"
            :zoomSpeed="0.5"
            :rotateSpeed="0.5"
            :minDistance="3"
            :maxDistance="8"
            :minPolarAngle="Math.PI / 4"
            :maxPolarAngle="Math.PI / 2"
            :autoRotate="false"
            :enableRotate="true"
            @start="onControlsStart"
          />
        </TresCanvas>
      </div>

      <!-- Character Details Card -->
      <div class="character-selection__card" v-if="selectedCharacter">
        <!-- Character Portrait Row -->
        <div class="character-selection__portrait-row">
          <!-- Instrument Badges (Top Left) -->
          <div class="character-selection__badges-container">
            <div
              v-for="instrument in selectedCharacter.instruments"
              :key="instrument"
              class="character-selection__badge"
              :title="instrument"
            >
              <img :src="badgeMap[instrument]" :alt="instrument" />
            </div>
          </div>

          <!-- Center Column (Avatar) -->
          <div class="character-selection__portrait-center">
            <div class="character-selection__portrait-inner">
              {{ selectedCharacter.name.charAt(0) }}
            </div>
          </div>

          <!-- Empty right side for balance -->
          <div class="character-selection__portrait-spacer"></div>
        </div>

        <div class="character-selection__card-content">
          <h3 class="character-selection__card-title">{{ selectedCharacter.name }}</h3>

          <div class="character-selection__info-section">
            <h4 class="character-selection__section-title">Influences</h4>
            <div class="character-selection__influences-container">
              <span
                v-for="influence in selectedCharacter.influences"
                :key="influence"
                class="character-selection__influence-chip"
              >
                {{ influence }}
              </span>
            </div>
          </div>

          <div class="character-selection__info-section">
            <h4 class="character-selection__section-title">Favorite Frisches Song</h4>
            <a href="#" class="character-selection__favorite-song-link" @click.prevent>
              <span class="character-selection__favorite-song">{{
                selectedCharacter.favoriteSong
              }}</span>
              <span class="character-selection__play-icon">▶</span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Character Selection Buttons -->
    <div class="character-selection__buttons">
      <button
        v-for="(character, index) in characters"
        :key="character.id"
        class="character-selection__button"
        :class="{ 'character-selection__button--active': index === selectedIndex }"
        @click="selectCharacter(index)"
        :disabled="isAnimating"
        :aria-label="`Select ${character.name}`"
      >
        {{ character.name.charAt(0) }}
      </button>
    </div>
  </div>
</template>

<style scoped src="./characterSelection/CharacterSelection.css"></style>
