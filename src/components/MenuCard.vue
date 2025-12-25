<script setup lang="ts">
import { ref, computed } from 'vue'

export interface MenuCardProps {
  title: string
  image: string
  route: string
  index?: number
}

const props = withDefaults(defineProps<MenuCardProps>(), {
  index: 0,
})

const cardRef = ref<HTMLElement | null>(null)
const isHovered = ref(false)

const cardStyle = computed(() => ({
  backgroundImage: `url(${props.image})`,
}))

const emit = defineEmits<{
  click: [route: string]
}>()

const handleClick = () => {
  emit('click', props.route)
}

defineExpose({
  cardEl: cardRef,
})
</script>

<template>
  <div
    ref="cardRef"
    class="menu-card"
    :class="{ 'menu-card--hovered': isHovered }"
    :style="cardStyle"
    :data-testid="`card-${props.route.slice(1)}`"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleClick"
  >
    <div class="menu-card__overlay"></div>
    <div class="menu-card__content">
      <h3 class="menu-card__title">{{ title }}</h3>
    </div>
  </div>
</template>

<style scoped>
.menu-card {
  position: relative;
  width: 180px;
  height: 280px;
  background-size: cover;
  background-position: center;
  border-radius: var(--radius-lg);
  cursor: pointer;
  overflow: hidden;
  transition: transform var(--transition-base);
  box-shadow: var(--shadow-lg);
}

.menu-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.8) 100%);
  z-index: 1;
}

.menu-card__overlay {
  position: absolute;
  inset: 0;
  background: var(--color-card-back);
  opacity: 0;
  transition: opacity var(--transition-base);
  z-index: 2;
  mix-blend-mode: multiply;
}

.menu-card--hovered {
  transform: translateY(-10px) scale(1.05);
  box-shadow: var(--shadow-xl), var(--shadow-glow);
}

.menu-card--hovered .menu-card__overlay {
  opacity: 0.3;
}

.menu-card__content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--spacing-lg);
  z-index: 3;
}

.menu-card__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  font-family: 'Orbitron', sans-serif;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .menu-card {
    width: 140px;
    height: 220px;
  }

  .menu-card__title {
    font-size: var(--font-size-lg);
  }

  .menu-card--hovered {
    transform: translateY(-5px) scale(1.03);
  }
}

/* Touch devices optimization */
@media (hover: none) and (pointer: coarse) {
  .menu-card:active {
    transform: translateY(-5px) scale(1.03);
  }
}
</style>
