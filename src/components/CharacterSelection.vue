<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, shallowRef, nextTick } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { PCFSoftShadowMap, SRGBColorSpace, ACESFilmicToneMapping, Vector3, Cache } from 'three'
import type { AnimationClip, Object3D } from 'three'
import gsap from 'gsap'
import GLTFModelWithEvents from './GLTFModelWithEvents.vue'
import CharacterInfoCard from './CharacterInfoCard.vue'
import type { Badge, InfoItem, InfoSection } from './CharacterInfoCard.vue'
import type { Character } from '@/types/character'
import { getTrackById } from '@/data/tracks'
import { getAlbumById } from '@/data/albums'
import { useAudioStore } from '@/stores/audio'
import { useCharacterPreloader } from '@/composables/useCharacterPreloader'

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
import instagramSvg from '@/assets/icons/social-instagram.svg?raw'
import spotifySvg from '@/assets/icons/social-spotify.svg?raw'
import youtubeSvg from '@/assets/icons/social-youtube.svg?raw'

const badgeMap: Record<string, string> = {
  Guitar: guitarHeadSvg,
  Bass: bassHeadSvg,
  Singer: microphoneSvg,
  Flute: fluteSvg,
  Drums: drumSticksSvg,
  'Backing Vocals': choirSvg,
}

const DEFAULT_SCALE = 2.5
const DEFAULT_ROTATION_Y = 0

const characters = ref<Character[]>([
  {
    id: 1,
    name: 'Edgar',
    modelPath: new URL('../assets/private/threed/monster1.glb', import.meta.url).href,
    rotationY: Math.PI,
    //scale: DEFAULT_SCALE,
    instruments: ['Guitar', 'Backing Vocals'],
    influences: ['Led Zeppelin', 'Beatles'],
    favoriteTrackId: 'tftc:02-tojd',
  },
  {
    id: 2,
    name: 'Cami',
    modelPath: new URL('../assets/private/threed/witch.glb', import.meta.url).href,
    rotationY: -Math.PI / 2,
    //scale: DEFAULT_SCALE,
    instruments: ['Singer', 'Flute'],
    influences: ['Beatles', 'Joni Mitchell'],
    favoriteTrackId: 'tftc:05-witch-hunting',
  },
  {
    id: 0,
    name: 'Frisches',
    isGroup: true,
    yearFormed: 2019,
    genre: 'Rock',
    description:
      'Powerful beats, punchy bass lines, gritty guitar riffs, touching solos and incisive lyrics. We embody rock in its purest form.',
    albumIds: ['tftc'],
    socialLinks: {
      instagram: 'https://www.instagram.com/frisches.band/',
      spotify: 'https://open.spotify.com/artist/3kzl8F6XMEkGhOXxYZBZJv',
      youtube: 'https://www.youtube.com/@frischesband',
    },
  },
  {
    id: 3,
    name: 'Steff',
    modelPath: new URL('../assets/private/threed/dealer.glb', import.meta.url).href,
    rotationY: -Math.PI / 2,
    //scale: DEFAULT_SCALE,
    instruments: ['Drums'],
    influences: ['Led Zeppelin', 'Pink Floyd'],
    favoriteTrackId: 'tftc:03-etiquette',
  },
  {
    id: 4,
    name: 'Tobi',
    modelPath: new URL('../assets/private/threed/monster2.glb', import.meta.url).href,
    rotationY: Math.PI,
    //scale: DEFAULT_SCALE,
    instruments: ['Bass'],
    influences: ['Red Hot Chili Peppers', 'Jimi Hendrix'],
    favoriteTrackId: 'tftc:01-misled',
  },
])

const selectedIndex = ref<number>(2) // Default to Frisches (F)
const isAnimating = ref<boolean>(false)

// Get preloader state to check if models are already cached
const { preloadComplete } = useCharacterPreloader()

// Auto-rotation state
const isAutoRotating = ref<boolean>(false)
let autoRotationTween: gsap.core.Tween | null = null
const AUTO_ROTATION_DURATION = 3 // seconds for full 360 rotation

// OrbitControls ref for camera reset
const orbitControlsRef = ref<InstanceType<typeof OrbitControls> | null>(null)
const initialCameraPosition = new Vector3(0, 0, 0)
const initialTarget = new Vector3(0, 0, 0)

const emit = defineEmits<{
  (e: 'back'): void
}>()

// Navigation Logic
const bandMembers = computed(() => characters.value.filter((c) => !c.isGroup))
const groupCharacter = computed(() => characters.value.find((c) => c.isGroup))

const nextBandMember = () => {
  const currentChar = selectedCharacter.value
  if (!currentChar || currentChar.isGroup) return

  const currentBandIndex = bandMembers.value.findIndex((c) => c.id === currentChar.id)
  const nextBandIndex = (currentBandIndex + 1) % bandMembers.value.length
  const nextMember = bandMembers.value[nextBandIndex]
  if (nextMember) {
    const globalIndex = characters.value.findIndex((c) => c.id === nextMember.id)
    selectCharacter(globalIndex)
  }
}

const prevBandMember = () => {
  const currentChar = selectedCharacter.value
  if (!currentChar || currentChar.isGroup) return

  const currentBandIndex = bandMembers.value.findIndex((c) => c.id === currentChar.id)
  const prevBandIndex = (currentBandIndex - 1 + bandMembers.value.length) % bandMembers.value.length
  const prevMember = bandMembers.value[prevBandIndex]
  if (prevMember) {
    const globalIndex = characters.value.findIndex((c) => c.id === prevMember.id)
    selectCharacter(globalIndex)
  }
}

const goToGroup = () => {
  const group = groupCharacter.value
  if (group) {
    const groupIndex = characters.value.findIndex((c) => c.id === group.id)
    selectCharacter(groupIndex)
  }
}

const goToFirstBandMember = () => {
  const firstMember = bandMembers.value[0]
  if (firstMember) {
    const globalIndex = characters.value.findIndex((c) => c.id === firstMember.id)
    selectCharacter(globalIndex)
  }
}

const goToCharacterByLetter = (letter: string) => {
  const char = characters.value.find((c) => c.name.charAt(0).toUpperCase() === letter.toUpperCase())
  if (char) {
    const index = characters.value.findIndex((c) => c.id === char.id)
    selectCharacter(index)
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('back')
  } else if (e.key === 'ArrowRight') {
    nextBandMember()
  } else if (e.key === 'ArrowLeft') {
    prevBandMember()
  } else if (e.key === 'ArrowUp') {
    goToGroup()
  } else if (e.key === 'ArrowDown') {
    goToFirstBandMember()
  } else if (['E', 'C', 'F', 'S', 'T'].includes(e.key.toUpperCase())) {
    goToCharacterByLetter(e.key)
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
    nextBandMember()
  } else if (touchEndX.value > touchStartX.value + threshold) {
    prevBandMember()
  }
}

// Model loading state
// If models are preloaded, don't show loading indicator initially
// In test mode, preloading doesn't happen, so always start with loading = true
const isModelLoading = ref(import.meta.env.MODE === 'test' ? true : !preloadComplete.value)
const preloadAllModels = ref(false)

// Note: Models are preloaded from App.vue via useCharacterPreloader
// The Three.js Cache ensures they're shared across loaders

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('touchstart', handleTouchStart)
  window.addEventListener('touchend', handleTouchEnd)

  // Wait for DOM to be ready before running any animations
  await nextTick()
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

const audioStore = useAudioStore()

const favoriteSongTitle = computed(() => {
  const trackId = selectedCharacter.value?.favoriteTrackId
  if (!trackId) return ''
  return getTrackById(trackId)?.title ?? ''
})

function playFavoriteSong() {
  const trackId = selectedCharacter.value?.favoriteTrackId
  if (!trackId) return
  audioStore.startFromAbout(trackId)
}

function navigateToAlbum(albumId: string) {
  // Navigate to music view and start playing the album
  const album = getAlbumById(albumId)
  if (!album || !album.trackIds.length) return
  // Play the first track of the album
  audioStore.startFromAbout(album.trackIds[0] || '')
  // Close the about view
  emit('back')
}

// Transform character data for CharacterInfoCard
const cardLeftBadges = computed<Badge[]>(() => {
  if (!selectedCharacter.value) return []

  if (selectedCharacter.value.isGroup) {
    // Social links for group
    const badges: Badge[] = []
    const socialLinks = selectedCharacter.value.socialLinks
    if (socialLinks?.instagram) {
      badges.push({
        title: 'Instagram',
        link: socialLinks.instagram,
        icon: instagramSvg,
      })
    }
    if (socialLinks?.spotify) {
      badges.push({
        title: 'Spotify',
        link: socialLinks.spotify,
        icon: spotifySvg,
      })
    }
    if (socialLinks?.youtube) {
      badges.push({
        title: 'YouTube',
        link: socialLinks.youtube,
        icon: youtubeSvg,
      })
    }
    return badges
  } else {
    // Instruments for individual members
    return (
      selectedCharacter.value.instruments?.map((instrument) => ({
        title: instrument,
        image: badgeMap[instrument],
      })) || []
    )
  }
})

const cardRightInfo = computed<InfoItem[]>(() => {
  if (!selectedCharacter.value || !selectedCharacter.value.isGroup) return []

  const items: InfoItem[] = []
  if (selectedCharacter.value.yearFormed) {
    items.push({
      label: 'Founded',
      value: String(selectedCharacter.value.yearFormed),
    })
  }
  if (selectedCharacter.value.genre) {
    items.push({
      label: 'Genre',
      value: selectedCharacter.value.genre,
    })
  }
  return items
})

const cardSections = computed<InfoSection[]>(() => {
  if (!selectedCharacter.value) return []

  const sections: InfoSection[] = []

  if (selectedCharacter.value.isGroup) {
    // Group character sections
    if (selectedCharacter.value.description) {
      sections.push({
        title: 'Description',
        content: selectedCharacter.value.description,
        type: 'description',
      })
    }

    if (selectedCharacter.value.albumIds && selectedCharacter.value.albumIds.length > 0) {
      sections.push({
        title: 'Albums',
        content: selectedCharacter.value.albumIds.map((albumId) => {
          const album = getAlbumById(albumId)
          return album ? `${album.title} (${album.year})` : albumId
        }),
        type: 'buttons',
        clickable: true,
        onItemClick: (item: string) => {
          // Extract album ID from the button text
          const albumId = selectedCharacter.value?.albumIds?.find((id) => {
            const album = getAlbumById(id)
            return album && item.includes(album.title)
          })
          if (albumId) navigateToAlbum(albumId)
        },
      })
    }
  } else {
    // Individual character sections
    if (selectedCharacter.value.influences && selectedCharacter.value.influences.length > 0) {
      sections.push({
        title: 'Influences',
        content: selectedCharacter.value.influences,
        type: 'chips',
      })
    }

    if (selectedCharacter.value.favoriteTrackId) {
      const trackTitle = favoriteSongTitle.value
      if (trackTitle) {
        sections.push({
          title: 'Favorite Frisches Song',
          content: [`${trackTitle} ▶`],
          type: 'chips',
          clickable: true,
          onItemClick: () => playFavoriteSong(),
        })
      }
    }
  }

  return sections
})

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

  // Hide loading spinner when the SELECTED character is loaded
  // If all models were preloaded, we should already be showing content
  if (id === selectedCharacter.value?.id) {
    isModelLoading.value = false
  }

  // After the first model is loaded OR if preloading is complete,
  // allow background loading of other models
  if (!preloadAllModels.value && (id === selectedCharacter.value?.id || preloadComplete.value)) {
    preloadAllModels.value = true
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
  // If one model fails we still want to avoid blocking the UI indefinitely.
  preloadAllModels.value = true
}

// Character selection with animation
const selectCharacter = async (index: number) => {
  if (index === selectedIndex.value) return

  // Prevent multiple animations, but allow the first selection to animate
  if (isAnimating.value) return
  isAnimating.value = true

  // Only show loading if the model isn't already loaded or preloaded
  const targetCharacter = characters.value[index]
  // Guard against invalid index (TypeScript strict check)
  if (!targetCharacter) {
    isAnimating.value = false
    return
  }

  // Group characters don't have models, so no loading needed
  if (targetCharacter.isGroup) {
    isModelLoading.value = false
  } else {
    // Check if already loaded in component OR if all models were preloaded
    const isAlreadyLoaded = loadedModels.value.has(targetCharacter.id) || preloadComplete.value
    isModelLoading.value = !isAlreadyLoaded
  }

  // Stop auto-rotation and reset camera for new character
  stopAutoRotation()
  resetCameraToFrontal(false)

  // Wait for DOM to be ready if this is the first interaction
  await nextTick()

  // Animate card out then in
  const timeline = gsap.timeline({
    onComplete: () => {
      isAnimating.value = false
      // Start auto-rotation for the new character if already loaded and not a group
      if (
        !targetCharacter.isGroup &&
        targetCharacter.modelPath &&
        (loadedModels.value.has(targetCharacter.id) || preloadComplete.value)
      ) {
        setTimeout(() => startAutoRotation(), 100)
      }
    },
  })

  timeline
    .to('.character-info-card', {
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
      '.character-info-card',
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
  <div class="character-selection" data-testid="character-selection">
    <!-- Character and Card Container -->
    <div class="character-selection__content">
      <!-- 3D Character Model (only for individual members) -->
      <div
        v-if="!selectedCharacter?.isGroup"
        ref="modelContainerRef"
        class="character-selection__model-container"
      >
        <!-- Loading indicator -->
        <div v-if="isModelLoading" class="character-selection__loading">
          <div class="character-selection__loading-spinner"></div>
          <span>Loading...</span>
        </div>

        <TresCanvas
          v-bind="gl"
          render-mode="on-demand"
          :window-size="false"
          data-testid="gltf-canvas"
        >
          <TresPerspectiveCamera :position="[0, 0, 0]" :fov="50" />

          <!-- Simplified lighting for performance -->
          <TresAmbientLight :intensity="0.8" />
          <TresDirectionalLight :position="[5, 10, 5]" :intensity="1.0" />

          <!-- Load ALL models once, show/hide based on selection for instant switching -->
          <Suspense>
            <template v-for="character in characters" :key="character.id">
              <GLTFModelWithEvents
                v-if="
                  character.modelPath &&
                  (character.id === selectedCharacter?.id || preloadAllModels)
                "
                :path="character.modelPath"
                draco
                :auto-play-animation="false"
                :position="[0, 0, 0]"
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
      <CharacterInfoCard
        v-if="selectedCharacter"
        :name="selectedCharacter.name"
        :left-badges="cardLeftBadges"
        :right-info="cardRightInfo"
        :sections="cardSections"
      />
    </div>

    <!-- Character Selection Buttons - Single row centered -->
    <div class="character-selection__buttons">
      <button
        v-for="(character, index) in characters"
        :key="character.id"
        class="character-selection__button"
        :class="{
          'character-selection__button--active': index === selectedIndex,
          'character-selection__button--group': character.isGroup,
        }"
        data-testid="character-card"
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
