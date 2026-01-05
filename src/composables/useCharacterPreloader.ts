import { ref } from 'vue'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { Cache } from 'three'

// Enable Three.js cache globally (guarded for test mocks)
try {
  if (typeof Cache !== 'undefined' && Object.prototype.hasOwnProperty.call(Cache, 'enabled')) {
    ;(Cache as unknown as { enabled?: boolean }).enabled = true
  }
} catch {
  // Ignore in test environments where three is mocked.
}

// Track preload state globally (singleton)
const isPreloading = ref(false)
const preloadProgress = ref(0)
const preloadComplete = ref(false)
const preloadedPaths = new Set<string>()

// Model paths - these must match CharacterSelection.vue
const MODEL_PATHS = [
  new URL('../assets/private/threed/monster1.glb', import.meta.url).href,
  new URL('../assets/private/threed/witch.glb', import.meta.url).href,
  new URL('../assets/private/threed/dealer.glb', import.meta.url).href,
  new URL('../assets/private/threed/monster2.glb', import.meta.url).href,
]

// Singleton loader instances
let dracoLoader: DRACOLoader | null = null
let gltfLoader: GLTFLoader | null = null

function getLoaders() {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    dracoLoader.preload()
  }

  if (!gltfLoader) {
    gltfLoader = new GLTFLoader()
    gltfLoader.setDRACOLoader(dracoLoader)
  }

  return { dracoLoader, gltfLoader }
}

/**
 * Preload all character models in the background
 * Safe to call multiple times - will only load once
 */
export function preloadCharacterModels(): Promise<void> {
  // Skip in test environment or if already done/in progress
  if (import.meta.env.MODE === 'test' || preloadComplete.value || isPreloading.value) {
    return Promise.resolve()
  }

  isPreloading.value = true
  preloadProgress.value = 0

  const { gltfLoader } = getLoaders()
  let loadedCount = 0

  return new Promise((resolve) => {
    MODEL_PATHS.forEach((path) => {
      if (preloadedPaths.has(path)) {
        loadedCount++
        preloadProgress.value = loadedCount / MODEL_PATHS.length
        if (loadedCount === MODEL_PATHS.length) {
          preloadComplete.value = true
          isPreloading.value = false
          resolve()
        }
        return
      }

      gltfLoader.load(
        path,
        () => {
          preloadedPaths.add(path)
          loadedCount++
          preloadProgress.value = loadedCount / MODEL_PATHS.length
          console.log(`[Preloader] Loaded model ${loadedCount}/${MODEL_PATHS.length}`)

          if (loadedCount === MODEL_PATHS.length) {
            preloadComplete.value = true
            isPreloading.value = false
            console.log('[Preloader] All character models preloaded!')
            resolve()
          }
        },
        undefined,
        (error) => {
          console.warn('[Preloader] Failed to preload model:', path, error)
          loadedCount++
          preloadProgress.value = loadedCount / MODEL_PATHS.length

          if (loadedCount === MODEL_PATHS.length) {
            preloadComplete.value = true
            isPreloading.value = false
            resolve()
          }
        }
      )
    })
  })
}

/**
 * Composable to use character preloader state
 */
export function useCharacterPreloader() {
  return {
    isPreloading,
    preloadProgress,
    preloadComplete,
    preloadCharacterModels,
  }
}
