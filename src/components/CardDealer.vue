<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MenuCard from './MenuCard.vue'
import { useGSAP, useFadeIn } from '../composables/useGSAP'
import gsap from 'gsap'

const router = useRouter()
const containerRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const subtitleRef = ref<HTMLElement | null>(null)
const cardsRef = ref<HTMLElement[]>([])

// Fade in animations for title and subtitle
useFadeIn(titleRef, { duration: 1, delay: 0.3, y: 50 })
useFadeIn(subtitleRef, { duration: 1, delay: 0.6, y: 30 })

// Menu items configuration
const menuItems = [
  {
    title: 'Music',
    image: new URL('../assets/images/menu-card-music.jpg', import.meta.url).href,
    route: '/music'
  },
  {
    title: 'About',
    image: new URL('../assets/images/menu-card-about.jpg', import.meta.url).href,
    route: '/about'
  },
  {
    title: 'Tour',
    image: new URL('../assets/images/menu-card-tour.jpg', import.meta.url).href,
    route: '/tour'
  }
]

const handleCardClick = (route: string) => {
  console.log('Navigating to:', route)
  // router.push(route) // Uncomment when routes are ready
}

// Card dealing animation
useGSAP(() => {
  if (!cardsRef.value || cardsRef.value.length === 0) return

  // Initial state - cards off screen
  gsap.set(cardsRef.value, {
    opacity: 0,
    y: 100,
    rotation: -15,
    scale: 0.8
  })

  // Deal cards with stagger
  gsap.to(cardsRef.value, {
    opacity: 1,
    y: 0,
    rotation: 0,
    scale: 1,
    duration: 0.8,
    stagger: 0.15,
    delay: 1,
    ease: 'back.out(1.4)'
  })
})

onMounted(() => {
  console.log('CardDealer mounted')
})
</script>

<template>
  <div ref="containerRef" class="card-dealer">
    <div class="card-dealer__background">
      <img
        src="../assets/images/card-dealer-main.jpg"
        alt="Mysterious card dealer"
        class="card-dealer__bg-image"
      />
      <div class="card-dealer__overlay"></div>
    </div>

    <div class="card-dealer__content">
      <h1 ref="titleRef" class="card-dealer__title">Frisches</h1>
      <p ref="subtitleRef" class="card-dealer__subtitle">Choose your path</p>

      <div class="card-dealer__cards">
        <MenuCard
          v-for="(item, index) in menuItems"
          :key="item.route"
          :ref="el => { if (el) cardsRef[index] = el.$el }"
          :title="item.title"
          :image="item.image"
          :route="item.route"
          :index="index"
          @click="handleCardClick"
          class="card-dealer__card"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-dealer {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-dealer__background {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.card-dealer__bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.card-dealer__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 10, 18, 0.3) 0%,
    rgba(10, 10, 18, 0.7) 50%,
    rgba(10, 10, 18, 0.9) 100%
  );
}

.card-dealer__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3xl);
  padding: var(--spacing-2xl);
  text-align: center;
}

.card-dealer__title {
  font-size: var(--font-size-5xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.8);
  margin-bottom: var(--spacing-sm);
}

.card-dealer__subtitle {
  font-size: var(--font-size-xl);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-light);
  font-style: italic;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.card-dealer__cards {
  display: flex;
  gap: var(--spacing-xl);
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.card-dealer__card {
  /* Cards will be animated with GSAP */
  opacity: 1;
}

/* Tablet responsiveness */
@media (max-width: 1024px) {
  .card-dealer__title {
    font-size: var(--font-size-4xl);
  }

  .card-dealer__subtitle {
    font-size: var(--font-size-lg);
  }

  .card-dealer__content {
    gap: var(--spacing-2xl);
  }

  .card-dealer__cards {
    gap: var(--spacing-lg);
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .card-dealer__title {
    font-size: var(--font-size-3xl);
  }

  .card-dealer__subtitle {
    font-size: var(--font-size-base);
  }

  .card-dealer__content {
    gap: var(--spacing-xl);
    padding: var(--spacing-lg);
  }

  .card-dealer__cards {
    gap: var(--spacing-md);
  }
}

/* Small mobile devices */
@media (max-width: 480px) {
  .card-dealer__title {
    font-size: var(--font-size-2xl);
  }

  .card-dealer__cards {
    flex-direction: column;
  }
}
</style>
