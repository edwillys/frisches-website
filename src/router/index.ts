import { createRouter, createWebHistory } from 'vue-router'

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
  ],
})

export default router
