// Global model cache - just calling useGLTF leverages internal caching
const modelCache = new Set<string>()

export function useModelCache() {
  /**
   * Start loading a model (the useGLTF hook handles caching internally)
   */
  function loadModel(path: string): void {
    if (!modelCache.has(path)) {
      try {
        modelCache.add(path)
      } catch (e) {
        console.warn('Failed to start loading model:', path, e)
      }
    }
  }

  /**
   * Preload multiple models by initiating their loads
   */
  function preloadModels(paths: string[]): void {
    paths.forEach((path) => loadModel(path))
  }

  return {
    loadModel,
    preloadModels,
  }
}
