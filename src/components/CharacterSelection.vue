<script setup lang="ts">
import { ref, computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'
import gsap from 'gsap'
import GLTFModelWithEvents from './GLTFModelWithEvents.vue'

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

// Track loaded models for preloading
const loadedModels = new Map<number, unknown>()

const selectedCharacter = computed(() => characters.value[selectedIndex.value])

interface GLTFScene {
  animations?: Array<{ name: string }>
}

interface GLTFPayload {
  scene?: unknown
}

const isGLTFPayload = (value: unknown): value is GLTFPayload =>
  !!value && typeof value === 'object' && 'scene' in value

// Preload all models
const onModelLoaded = (id: number, payload: unknown) => {
  if (!isGLTFPayload(payload)) return
  if (payload.scene) {
    loadedModels.set(id, payload.scene)

    // Log available animations
    const scene = payload.scene as GLTFScene
    if (scene.animations && scene.animations.length > 0) {
      console.log(
        `Character ${id} available animations:`,
        scene.animations.map((a) => a.name)
      )
    } else {
      console.log(`Character ${id} has no animations`)
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
</script>

<template>
  <div class="character-selection">
    <!-- Character and Card Container -->
    <div class="character-selection__content">
      <!-- 3D Character Model -->
      <div class="character-selection__model-container">
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
            />
          </template>

          <OrbitControls
            :enableDamping="true"
            :dampingFactor="0.05"
            :enablePan="false"
            :enableZoom="false"
            :minPolarAngle="Math.PI / 4"
            :maxPolarAngle="Math.PI / 2"
            :autoRotate="false"
            :enableRotate="false"
          />
        </TresCanvas>
      </div>

      <!-- Character Details Card -->
      <div class="character-selection__card" v-if="selectedCharacter">
        <!-- Character Portrait with Badges -->
        <div class="character-selection__portrait">
          <div class="character-selection__portrait-inner">
            {{ selectedCharacter.name.charAt(0) }}
          </div>
          <!-- Instrument Badges next to avatar -->
          <div class="character-selection__badges">
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

        <div class="character-selection__card-content">
          <h3 class="character-selection__card-title">{{ selectedCharacter.name }}</h3>

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
