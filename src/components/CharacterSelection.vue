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
    instruments: ['Guitar', 'Vocals'],
    influences: ['Black Sabbath', 'Led Zeppelin', 'Pink Floyd'],
    favoriteSong: 'Tales From The Cellar',
  },
  {
    id: 2,
    name: 'Cami',
    modelPath: new URL('../assets/threed/monster2.glb', import.meta.url).href,
    instruments: ['Bass', 'Backing Vocals'],
    influences: ['The Stooges', 'Motörhead', 'The Ramones'],
    favoriteSong: 'Witch Hunting',
  },
])

const selectedIndex = ref<number>(0)
const rotationAngle = ref<number>(0)
const isAnimating = ref<boolean>(false)

// Circular positioning parameters
const radius = 3.5
const angleStep = (Math.PI * 2) / characters.value.length

const selectedCharacter = computed(() => characters.value[selectedIndex.value])

// Calculate position for each character in the circle
const getCharacterPosition = (index: number, currentRotation: number): [number, number, number] => {
  const angle = index * angleStep + currentRotation
  return [Math.sin(angle) * radius, 0, Math.cos(angle) * radius]
}

// Calculate rotation for character to face camera
const getCharacterRotation = (index: number, currentRotation: number): [number, number, number] => {
  const angle = index * angleStep + currentRotation
  return [0, -angle + Math.PI, 0] // Face inward (toward center/camera)
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
  clearColor: 'transparent',
  shadows: true,
  alpha: true,
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
        <TresPerspectiveCamera :position="[0, 3, 10]" :fov="45" />

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
                :rotation="getCharacterRotation(index, 0)"
                :scale="index === selectedIndex ? 2 : 1.5"
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

            <!-- Shadow overlay for unselected characters -->
            <template v-if="index !== selectedIndex">
              <TresMesh
                :position="[
                  getCharacterPosition(index, 0)[0],
                  2,
                  getCharacterPosition(index, 0)[2],
                ]"
                :scale="[2.5, 2.5, 2.5]"
              >
                <TresSphereGeometry :args="[1, 32, 32]" />
                <TresMeshBasicMaterial :color="new Color(0x000000)" :opacity="0.7" transparent />
              </TresMesh>
            </template>
          </template>
        </TresGroup>

        <!-- Ground Plane -->
        <TresMesh :position="[0, -0.02, 0]" :rotation="[-Math.PI / 2, 0, 0]" receive-shadow>
          <TresPlaneGeometry :args="[25, 25]" />
          <TresMeshStandardMaterial
            :color="new Color(0x0a0a0a)"
            :metalness="0.3"
            :roughness="0.8"
          />
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

    <!-- Selected Character Name (centered at bottom) -->
    <div class="character-selection__name-display">
      <h2 class="character-selection__name">{{ selectedCharacter?.name }}</h2>
    </div>

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

<style scoped>
.character-selection {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
}

.character-selection__scene {
  flex: 1;
  position: relative;
  width: 100%;
  min-height: 500px;
}

/* Navigation Arrows - positioned near center */
.character-selection__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  background: rgba(0, 0, 0, 0.85);
  border: 3px solid #ffeb3b;
  border-radius: 50%;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffeb3b;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  box-shadow:
    0 0 20px rgba(255, 235, 59, 0.3),
    inset 0 0 20px rgba(255, 235, 59, 0.1);
}

.character-selection__arrow:hover:not(:disabled) {
  background: rgba(255, 235, 59, 0.15);
  border-color: #ffd54f;
  transform: translateY(-50%) scale(1.15);
  box-shadow:
    0 0 30px rgba(255, 235, 59, 0.6),
    inset 0 0 30px rgba(255, 235, 59, 0.2);
}

.character-selection__arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
}

.character-selection__arrow--left {
  left: 35%;
}

.character-selection__arrow--right {
  right: 35%;
}

/* Character Name Display (centered below scene) */
.character-selection__name-display {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  text-align: center;
}

.character-selection__name {
  font-size: 2.5rem;
  font-weight: bold;
  color: #ffeb3b;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 4px;
  text-shadow:
    0 0 20px rgba(255, 235, 59, 1),
    0 0 40px rgba(255, 235, 59, 0.6),
    0 0 60px rgba(255, 235, 59, 0.4),
    0 4px 8px rgba(0, 0, 0, 0.8);
  animation: pulse 2.5s ease-in-out infinite;
  font-family: 'Cinzel', 'Georgia', serif;
  font-weight: 700;
}

@keyframes pulse {
  0%,
  100% {
    text-shadow:
      0 0 20px rgba(255, 235, 59, 1),
      0 0 40px rgba(255, 235, 59, 0.6),
      0 0 60px rgba(255, 235, 59, 0.4),
      0 4px 8px rgba(0, 0, 0, 0.8);
  }
  50% {
    text-shadow:
      0 0 30px rgba(255, 235, 59, 1),
      0 0 60px rgba(255, 235, 59, 0.8),
      0 0 90px rgba(255, 235, 59, 0.6),
      0 4px 12px rgba(0, 0, 0, 0.9);
  }
}

/* RPG-Style Character Card */
.character-selection__details {
  position: absolute;
  top: 2rem;
  right: 2rem;
  width: 380px;
  z-index: 10;
  perspective: 1000px;
}

.character-selection__card {
  background: linear-gradient(135deg, rgba(15, 10, 5, 0.98) 0%, rgba(30, 20, 10, 0.98) 100%);
  border: 4px solid #d4af37;
  border-radius: 20px;
  padding: 0;
  backdrop-filter: blur(16px);
  box-shadow:
    0 0 40px rgba(212, 175, 55, 0.5),
    inset 0 0 60px rgba(212, 175, 55, 0.1),
    0 15px 60px rgba(0, 0, 0, 0.9);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.character-selection__card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    #d4af37 20%,
    #ffd700 50%,
    #d4af37 80%,
    transparent 100%
  );
  animation: shimmer 3s ease-in-out infinite;
}

.character-selection__card::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 16px;
  pointer-events: none;
}

@keyframes shimmer {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

.character-selection__details:hover .character-selection__card {
  transform: translateY(-4px) scale(1.02);
  box-shadow:
    0 0 50px rgba(212, 175, 55, 0.7),
    inset 0 0 80px rgba(212, 175, 55, 0.15),
    0 20px 80px rgba(0, 0, 0, 0.95);
  border-color: #ffd700;
}

/* Character Portrait */
.character-selection__portrait {
  padding: 2rem 2rem 1.5rem;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.character-selection__portrait-inner {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 4px solid #d4af37;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.5rem;
  font-weight: bold;
  color: #d4af37;
  font-family: 'Cinzel', 'Georgia', serif;
  box-shadow:
    0 0 30px rgba(212, 175, 55, 0.6),
    inset 0 0 40px rgba(0, 0, 0, 0.8);
  position: relative;
  overflow: hidden;
}

.character-selection__portrait-inner::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 70%
  );
  animation: portraitShine 4s ease-in-out infinite;
}

@keyframes portraitShine {
  0%,
  100% {
    transform: rotate(0deg) translate(-50%, -50%);
  }
  50% {
    transform: rotate(180deg) translate(-50%, -50%);
  }
}

/* Card Content */
.character-selection__card-content {
  padding: 0 2rem 2rem;
  position: relative;
  z-index: 1;
}

.character-selection__card-title {
  font-size: 2rem;
  font-weight: 700;
  color: #d4af37;
  margin: 0 0 1.5rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 3px;
  font-family: 'Cinzel', 'Georgia', serif;
  text-shadow:
    0 0 20px rgba(212, 175, 55, 0.8),
    0 2px 8px rgba(0, 0, 0, 0.9);
}
.character-selection__info-section {
  margin-bottom: 1.5rem;
  position: relative;
}

.character-selection__info-section:last-child {
  margin-bottom: 0;
}

.character-selection__section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #ffd700;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-family: 'Cinzel', 'Georgia', serif;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
  border-bottom: 2px solid rgba(212, 175, 55, 0.3);
  padding-bottom: 0.5rem;
}

.character-selection__info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.character-selection__info-list li {
  padding: 0.5rem 0;
  color: #d4af37;
  font-size: 1rem;
  position: relative;
  padding-left: 1.5rem;
  line-height: 1.6;
  transition: all 0.2s ease;
  font-family: 'Georgia', serif;
}

.character-selection__info-list li:hover {
  color: #ffd700;
  padding-left: 1.75rem;
}

.character-selection__info-list li::before {
  content: '⚔';
  position: absolute;
  left: 0;
  color: #d4af37;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.character-selection__info-list li:hover::before {
  left: 0.25rem;
  color: #ffd700;
}

.character-selection__section-text,
.character-selection__favorite-song {
  color: #d4af37;
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
  font-family: 'Georgia', serif;
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .character-selection__details {
    width: 280px;
    right: 1rem;
    top: 1rem;
  }

  .character-selection__name {
    font-size: 2.75rem;
    letter-spacing: 4px;
  }

  .character-selection__arrow {
    width: 60px;
    height: 60px;
  }

  .character-selection__arrow--left {
    left: 30%;
  }

  .character-selection__arrow--right {
    right: 30%;
  }
}

@media (max-width: 768px) {
  .character-selection__details {
    position: relative;
    right: auto;
    top: auto;
    margin: 1rem auto;
    width: calc(100% - 2rem);
    max-width: 400px;
  }

  .character-selection__name-display {
    bottom: 2rem;
  }

  .character-selection__name {
    font-size: 2rem;
    letter-spacing: 3px;
  }

  .character-selection__arrow {
    width: 50px;
    height: 50px;
  }

  .character-selection__arrow--left {
    left: 20%;
  }

  .character-selection__arrow--right {
    right: 20%;
  }

  .character-selection__scene {
    min-height: 350px;
  }
}

@media (max-width: 480px) {
  .character-selection__name {
    font-size: 1.5rem;
    letter-spacing: 2px;
  }

  .character-selection__arrow {
    width: 45px;
    height: 45px;
  }

  .character-selection__arrow--left {
    left: 15%;
  }

  .character-selection__arrow--right {
    right: 15%;
  }
}
</style>
