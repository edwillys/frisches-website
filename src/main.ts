import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

import App from './App.vue'
import router from './router'

// Import global styles
import './assets/styles/variables.css'
import './assets/styles/base.css'
import 'primeicons/primeicons.css'
import './assets/styles/primevue-unstyled.css'

function loseAllWebGLContexts() {
  if (typeof document === 'undefined') return

  const canvases = document.querySelectorAll('canvas')
  canvases.forEach((canvas) => {
    const el = canvas as HTMLCanvasElement

    const gl =
      (el.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (el.getContext('webgl') as WebGLRenderingContext | null)

    if (!gl) return

    try {
      const ext = gl.getExtension('WEBGL_lose_context') as
        | { loseContext?: () => void }
        | null
        | undefined
      ext?.loseContext?.()
    } catch {
      // ignore
    }
  })

  // Aggressive cleanup: remove orphaned SVG animations and force browser to release memory
  try {
    // Stop all SVG animations
    const animateElements = document.querySelectorAll('animate, animateTransform, animateMotion')
    animateElements.forEach((el) => {
      try {
        ;(el as SVGAnimationElement).endElement?.()
      } catch {}
    })

    // Clear any data URLs or large attributes that might be cached
    const imgs = document.querySelectorAll('img[src^="data:"]')
    imgs.forEach((img) => {
      try {
        ;(img as HTMLImageElement).src = ''
      } catch {}
    })
  } catch {
    // ignore
  }
}

function shouldCleanupForHmrUpdate(payload: unknown): boolean {
  // Vite payload shape: { updates: Array<{ path: string; acceptedPath: string; type: string }> }
  if (!payload || typeof payload !== 'object') return false

  const updates = (payload as { updates?: Array<{ path?: string }> }).updates
  if (!Array.isArray(updates) || updates.length === 0) return false

  // Only run for source updates (not CSS-only tweaks).
  return updates.some((u) => {
    const p = u?.path || ''
    return (
      p.includes('/src/') &&
      (p.endsWith('.vue') || p.endsWith('.ts') || p.endsWith('.js') || p.endsWith('.tsx'))
    )
  })
}

// Ensure GPU memory is released promptly on dev reloads.
if (typeof window !== 'undefined') {
  const onExit = () => loseAllWebGLContexts()
  window.addEventListener('beforeunload', onExit)
  window.addEventListener('pagehide', onExit)

  if (import.meta.hot) {
    // HMR is leaking memory badly with Vue components + SVG animations + Three.js.
    // Force full reload for .vue file changes to ensure clean state.
    import.meta.hot.on('vite:beforeUpdate', (payload) => {
      if (shouldCleanupForHmrUpdate(payload)) {
        loseAllWebGLContexts()

        // Check if this is a .vue file change - if so, force full reload
        const updates = (payload as { updates?: Array<{ path?: string }> }).updates
        const hasVueUpdate = updates?.some((u) => u?.path?.endsWith('.vue'))

        if (hasVueUpdate) {
          // Force full page reload to prevent memory accumulation
          window.location.reload()
          return
        }
      }
    })

    // Vite triggers this before doing a full page reload.
    import.meta.hot.on('vite:beforeFullReload', () => {
      loseAllWebGLContexts()
    })

    import.meta.hot.dispose(() => {
      loseAllWebGLContexts()
      window.removeEventListener('beforeunload', onExit)
      window.removeEventListener('pagehide', onExit)
    })
  }
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark-theme',
    },
  },
})

app.mount('#app')
