import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import * as Sentry from '@sentry/vue'

import App from './App.vue'
import router from './router'

// Import global styles
import './assets/styles/variables.css'
import './assets/styles/base.css'
import 'primeicons/primeicons.css'
import './assets/styles/primevue-unstyled.css'

const app = createApp(App)

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration({ router })],
    // Capture 10 % of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Only send errors in production
    enabled: import.meta.env.PROD,
  })
}

const umamiId = import.meta.env.VITE_UMAMI_WEBSITE_ID
if (umamiId) {
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://cloud.umami.is/script.js'
  s.setAttribute('data-website-id', umamiId)
  document.head.appendChild(s)
}

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
