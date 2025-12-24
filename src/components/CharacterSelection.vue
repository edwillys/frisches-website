<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'
import gsap from 'gsap'
import GLTFModelWithEvents from './GLTFModelWithEvents.vue'
import { useModelCache } from '@/composables/useModelCache'

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
    modelPath: new URL('../assets/threed/monster1.glb', import.meta.url).href,
    //rotationY: DEFAULT_ROTATION_Y,
    //scale: DEFAULT_SCALE,
    instruments: ['Guitar', 'Backing Vocals'],
    influences: ['Led Zeppelin', 'Beatles'],
    favoriteSong: 'Tears of Joyful Despair',
  },
  {
    id: 2,
    name: 'Cami',
    modelPath: new URL('../assets/threed/monster2.glb', import.meta.url).href,
    //rotationY: DEFAULT_ROTATION_Y,
    //scale: DEFAULT_SCALE,
    instruments: ['Singer', 'Flute'],
    influences: ['Beatles', 'Joni Mitchell'],
    favoriteSong: 'Witch Hunting',
  },
  {
    id: 3,
    name: 'Steff',
    modelPath: new URL('../assets/threed/monster3.glb', import.meta.url).href,
    //rotationY: DEFAULT_ROTATION_Y,
    //scale: DEFAULT_SCALE,
    instruments: ['Drums'],
    influences: ['Led Zeppelin', 'Pink Floyd'],
    favoriteSong: 'Étiquette',
  },
  {
    id: 4,
    name: 'Tobi',
    modelPath: new URL('../assets/threed/monster4.glb', import.meta.url).href,
    //rotationY: DEFAULT_ROTATION_Y,
    //scale: DEFAULT_SCALE,
    instruments: ['Bass'],
    influences: ['Red Hot Chili Peppers', 'Jimi Hendrix'],
    favoriteSong: 'Misled',
  },
])

const selectedIndex = ref<number>(0)
const isAnimating = ref<boolean>(false)

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
  touchStartX.value = e.changedTouches[0].screenX
}

const handleTouchEnd = (e: TouchEvent) => {
  touchEndX.value = e.changedTouches[0].screenX
  handleSwipe()
}

const handleSwipe = () => {
  const threshold = 50
  if (touchEndX.value < touchStartX.value - threshold) {
    nextCharacter()
  } else if (touchEndX.value > touchStartX.value + threshold) {
    prevCharacter()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('touchstart', handleTouchStart)
  window.addEventListener('touchend', handleTouchEnd)

  // Preload all character models
  const { preloadModels } = useModelCache()
  const modelPaths = characters.value.map((c) => c.modelPath)
  preloadModels(modelPaths)
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

// Character Interaction
const onCharacterClick = () => {
  // Trigger a temporary animation
  // Since we don't have specific animations loaded yet or they are not detected,
  // we can do a simple GSAP animation on the scale or rotation of the container
  // or just log for now as requested "to be defined yet".
  // But I'll add a small "jump" effect using the scale prop if possible, or just a console log.
  console.log('Character clicked!')

  // Simple jump animation using GSAP on the model container if possible,
  // but here we are inside the canvas.
  // We can animate the scale of the current character in the `characters` array temporarily?
  // Or better, emit an event.
}

// Track loaded models for preloading
const loadedModels = new Map<number, unknown>()

const selectedCharacter = computed(() => characters.value[selectedIndex.value])

interface GLTFPayload {
  scene?: unknown
}

const isGLTFPayload = (value: unknown): value is GLTFPayload =>
  !!value && typeof value === 'object' && 'scene' in value

// Preload all models
const onModelLoaded = (id: number, payload: unknown) => {
  console.log(`Model loaded for character ${id}`, payload)
  if (!isGLTFPayload(payload)) return

  const gltf = payload as { scene?: unknown; animations?: Array<{ name: string }> }

  if (gltf.scene) {
    loadedModels.set(id, gltf.scene)

    if (gltf.animations && gltf.animations.length > 0) {
      console.log(
        `Character ${id} available animations:`,
        gltf.animations.map((a) => a.name)
      )
    } else {
      console.log(`Character ${id} has no animations found`)
    }
  }
}

const onModelError = (id: number, error: unknown) => {
  console.error(`Failed to load model for character ${id}:`, error)
}

// Character selection with animation
const selectCharacter = (index: number) => {
  if (isAnimating.value || index === selectedIndex.value) return
  isAnimating.value = true

  // Animate card out then in
  const timeline = gsap.timeline({
    onComplete: () => {
      isAnimating.value = false
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

const gl = {
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

const modelContainerRef = ref<HTMLElement | null>(null)
</script>

<template>
  <div class="character-selection">
    <!-- Character and Card Container -->
    <div class="character-selection__content">
      <!-- 3D Character Model -->
      <div ref="modelContainerRef" class="character-selection__model-container">
        <TresCanvas v-bind="gl" render-mode="always">
          <TresPerspectiveCamera :position="[0, 1.2, 5]" :fov="50" />

          <!-- Lighting -->
          <TresAmbientLight :intensity="0.5" />
          <TresDirectionalLight
            :position="[5, 10, 5]"
            :intensity="1.5"
            cast-shadow
            :shadow-mapSize-width="2048"
            :shadow-mapSize-height="2048"
          />
          <TresPointLight :position="[0, 5, 0]" :intensity="0.6" color="#ffffff" />

          <!-- Preload all models, show only selected -->
          <template v-for="(character, index) in characters" :key="character.id">
            <GLTFModelWithEvents
              :path="character.modelPath"
              cast-shadow
              receive-shadow
              :position="[0, -2.2, 0]"
              :rotation="[0, character.rotationY ?? DEFAULT_ROTATION_Y, 0]"
              :scale="DEFAULT_SCALE"
              :visible="index === selectedIndex"
              @loaded="(payload) => onModelLoaded(character.id, payload)"
              @error="(err) => onModelError(character.id, err)"
              @click="onCharacterClick"
            />
          </template>

          <OrbitControls
            :enableDamping="false"
            :dampingFactor="0.02"
            :enablePan="false"
            :enableZoom="true"
            :zoomSpeed="1.5"
            :rotateSpeed="1.2"
            :minDistance="2.2"
            :maxDistance="10"
            :minPolarAngle="Math.PI / 4"
            :maxPolarAngle="Math.PI / 2"
            :autoRotate="false"
            :enableRotate="true"
          />
        </TresCanvas>
      </div>

      <!-- Character Details Card -->
      <div class="character-selection__card" v-if="selectedCharacter">
        <!-- Character Portrait Row -->
        <div class="character-selection__portrait-row">
          <!-- Left Column (Empty) -->
          <div class="character-selection__portrait-col-left"></div>

          <!-- Center Column (Avatar) -->
          <div class="character-selection__portrait-col-center">
            <div class="character-selection__portrait-inner">
              {{ selectedCharacter.name.charAt(0) }}
            </div>
          </div>

          <!-- Right Column (Badges Grid) -->
          <div class="character-selection__portrait-col-right">
            <div class="character-selection__badges-grid">
              <div
                v-for="instrument in selectedCharacter.instruments"
                :key="instrument"
                class="character-selection__badge"
                :title="instrument"
              >
                <img :src="badgeMap[instrument]" :alt="instrument" />
              </div>
            </div>
          </div>
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
              {{ selectedCharacter.favoriteSong }}
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
