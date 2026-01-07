<script setup lang="ts">
import { computed } from 'vue'

export interface Badge {
  title: string
  image?: string
  link?: string
  icon?: string // For social media icons (raw SVG string)
}

export interface InfoItem {
  label: string
  value: string
}

export interface InfoSection {
  title: string
  content: string | string[] // Can be description text or array of chips
  type?: 'description' | 'chips' | 'buttons'
  clickable?: boolean // For chips/buttons
  onItemClick?: (item: string) => void
}

interface Props {
  name: string
  avatar?: string // Initial or single character for avatar
  leftBadges?: Badge[] // Top-left badges (instruments or social links)
  rightInfo?: InfoItem[] // Top-right info items
  sections?: InfoSection[] // Bottom sections (influences, albums, etc.)
}

const props = withDefaults(defineProps<Props>(), {
  avatar: '',
  leftBadges: () => [],
  rightInfo: () => [],
  sections: () => [],
})

const avatarInitial = computed(() => {
  return props.avatar || props.name.charAt(0)
})

const handleBadgeClick = (badge: Badge) => {
  if (badge.link) {
    window.open(badge.link, '_blank', 'noopener,noreferrer')
  }
}

const handleSectionItemClick = (section: InfoSection, item: string) => {
  if (section.clickable && section.onItemClick) {
    section.onItemClick(item)
  }
}
</script>

<template>
  <div class="character-info-card character-selection__card" data-testid="character-info">
    <!-- Portrait Row -->
    <div class="character-info-card__portrait-row character-selection__portrait-row">
      <!-- Left Badges (Instruments or Social Links) -->
      <div
        class="character-info-card__badges-container character-selection__badges-container"
        :data-testid="leftBadges.some((b) => b.link) ? undefined : 'char-instruments'"
      >
        <component
          :is="badge.link ? 'a' : 'div'"
          v-for="(badge, index) in leftBadges"
          :key="index"
          :href="badge.link"
          :target="badge.link ? '_blank' : undefined"
          :rel="badge.link ? 'noopener noreferrer' : undefined"
          :aria-label="badge.title"
          class="character-info-card__badge character-selection__badge"
          :class="{ 'character-info-card__badge--link': badge.link }"
          :title="badge.title"
          @click="!badge.link && handleBadgeClick(badge)"
        >
          <img v-if="badge.image" :src="badge.image" :alt="badge.title" />
          <span v-else-if="badge.icon" v-html="badge.icon"></span>
        </component>
      </div>

      <!-- Center Avatar -->
      <div class="character-info-card__portrait-center character-selection__portrait-center">
        <div class="character-info-card__portrait-inner character-selection__portrait-inner">
          {{ avatarInitial }}
        </div>
      </div>

      <!-- Right Info Items -->
      <div class="character-info-card__right-info">
        <div v-for="(item, index) in rightInfo" :key="index" class="character-info-card__info-item">
          <span class="character-info-card__info-label">{{ item.label }}</span>
          <span class="character-info-card__info-value">{{ item.value }}</span>
        </div>
      </div>
    </div>

    <!-- Card Content -->
    <div class="character-info-card__content character-selection__card-content">
      <h3
        class="character-info-card__title character-selection__card-title"
        data-testid="character-name"
      >
        {{ name }}
      </h3>

      <!-- Dynamic Sections -->
      <div
        v-for="(section, index) in sections"
        :key="index"
        class="character-info-card__section character-selection__info-section"
      >
        <h4 class="character-info-card__section-title character-selection__section-title">
          {{ section.title }}
        </h4>

        <!-- Description Type -->
        <p
          v-if="section.type === 'description' && typeof section.content === 'string'"
          class="character-info-card__description"
        >
          {{ section.content }}
        </p>

        <!-- Chips Type (Influences, tags, etc.) -->
        <div
          v-else-if="section.type === 'chips' && Array.isArray(section.content)"
          class="character-info-card__chips-container character-selection__influences-container"
          :data-testid="section.title === 'Influences' ? 'char-influences' : undefined"
        >
          <span
            v-for="(chip, chipIndex) in section.content"
            :key="chipIndex"
            class="character-info-card__chip character-selection__influence-chip"
            :class="{
              'character-info-card__chip--clickable': section.clickable,
              'character-selection__favorite-song-link': section.title.includes('Favorite'),
            }"
            :data-testid="section.title.includes('Favorite') ? 'favorite-song-chip' : undefined"
            @click="handleSectionItemClick(section, chip)"
          >
            <span
              v-if="section.title.includes('Favorite')"
              class="character-selection__favorite-song"
            >
              {{ chip.replace(' ▶', '') }}
            </span>
            <span v-if="section.title.includes('Favorite')" class="character-selection__play-icon">
              ▶
            </span>
            <template v-if="!section.title.includes('Favorite')">
              {{ chip }}
            </template>
          </span>
        </div>

        <!-- Buttons Type (Albums, songs, etc.) -->
        <div
          v-else-if="section.type === 'buttons' && Array.isArray(section.content)"
          class="character-info-card__buttons-container"
        >
          <button
            v-for="(button, btnIndex) in section.content"
            :key="btnIndex"
            class="character-info-card__button"
            @click="handleSectionItemClick(section, button)"
          >
            {{ button }}
          </button>
        </div>

        <!-- Default: render as chips -->
        <div
          v-else-if="Array.isArray(section.content)"
          class="character-info-card__chips-container"
        >
          <span
            v-for="(chip, chipIndex) in section.content"
            :key="chipIndex"
            class="character-info-card__chip"
            :class="{ 'character-info-card__chip--clickable': section.clickable }"
            @click="handleSectionItemClick(section, chip)"
          >
            {{ chip }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './characterInfoCard/CharacterInfoCard.css';
</style>
