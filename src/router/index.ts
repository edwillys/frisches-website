import { createRouter, createWebHistory } from 'vue-router'
import { trackSectionViewed } from '@/analytics'
import { ensurePersistedAppLocale } from '@/i18n/locale'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/gallery',
      component: () => import('../views/GalleryView.vue'),
    },
    {
      path: '/impressum',
      component: () => import('../views/ImpressumView.vue'),
    },
    {
      path: '/datenschutz',
      component: () => import('../views/PrivacyPolicyView.vue'),
    },
  ],
})

export default router

router.beforeEach(() => {
  ensurePersistedAppLocale()
})

const SECTION_ROUTES: Record<string, 'music' | 'about' | 'gallery'> = {
  '/home': 'music',
  '/gallery': 'gallery',
}

router.afterEach((to) => {
  const section = SECTION_ROUTES[to.path]
  if (section) trackSectionViewed(section)
})
