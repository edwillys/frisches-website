<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls, GLTFModel } from '@tresjs/cientos'
import { Color, DoubleSide, ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'
import gsap from 'gsap'

interface Character {
  id: number
  name: string
  modelPath: string
  instruments: string[]
  influences: string[]
  favoriteSong: string
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
      <TresCanvas v-bind="gl">
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
            <Suspense>
              <GLTFModel
                :path="character.modelPath"
                :position="getCharacterPosition(index, 0)"
                :rotation="getCharacterRotation(index, rotationAngle)"
                :scale="index === selectedIndex ? 2 : 1.3"
                draco
              />
            </Suspense>

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
