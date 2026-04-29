<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AboutEntryCard from './AboutEntryCard.vue'
import AboutMembersView from './AboutMembersView.vue'
import LyricsCardsView from './LyricsCardsView.vue'
import { useAboutSubSection } from '@/composables/useAboutSubSection'

type AboutSubmenuKey = 'story' | 'members' | 'lyrics'

interface AboutViewState {
  activeSubmenu: AboutSubmenuKey
  canGoBack: boolean
}

interface Props {
  isActive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
})

const emit = defineEmits<{
  (e: 'state-change', payload: AboutViewState): void
}>()

const sectionsContainerRef = ref<HTMLElement | null>(null)

const { activeSection, switchSection, setSectionImmediately } = useAboutSubSection({
  containerRef: sectionsContainerRef,
  initialSection: 'entry',
})

const membersViewKey = ref(0)
const lyricsViewKey = ref(0)
const entryViewKey = ref(0)
const storyBackSignal = ref(0)
const storyOpenSignal = ref(0)
const lyricsBackSignal = ref(0)
const isStoryOpen = ref(false)
const isLyricsDetailOpen = ref(false)
const openStoryAfterEntry = ref(false)

const resetAboutState = () => {
  const needsReset =
    isStoryOpen.value ||
    isLyricsDetailOpen.value ||
    openStoryAfterEntry.value ||
    activeSection.value !== 'entry'
  if (!needsReset) return

  isStoryOpen.value = false
  isLyricsDetailOpen.value = false
  openStoryAfterEntry.value = false
  membersViewKey.value += 1
  lyricsViewKey.value += 1
  entryViewKey.value += 1
  setSectionImmediately('entry')
}

const openMembers = () => {
  void switchSection('members')
}

const openLyrics = () => {
  void switchSection('lyrics')
}

const goToEntry = () => {
  void switchSection('entry')
}

const openStory = () => {
  if (activeSection.value !== 'entry') {
    openStoryAfterEntry.value = true
    goToEntry()
    return
  }

  if (isStoryOpen.value) return
  storyOpenSignal.value += 1
}

const showGlobalBackButton = computed(
  () => activeSection.value !== 'entry' || isStoryOpen.value || isLyricsDetailOpen.value
)

const activeSubmenu = computed<AboutSubmenuKey>(() => {
  if (activeSection.value === 'members') return 'members'
  if (activeSection.value === 'lyrics') return 'lyrics'
  return 'story'
})

const handleGlobalBack = () => {
  if (activeSection.value === 'entry' && isStoryOpen.value) {
    storyBackSignal.value += 1
    return
  }

  if (activeSection.value === 'lyrics' && isLyricsDetailOpen.value) {
    lyricsBackSignal.value += 1
    return
  }

  if (activeSection.value !== 'entry') {
    goToEntry()
  }
}

const goBackOneStep = () => {
  if (!showGlobalBackButton.value) return false
  handleGlobalBack()
  return true
}

const navigateToSubmenu = (submenu: AboutSubmenuKey) => {
  if (submenu === 'members') {
    openMembers()
    return
  }

  if (submenu === 'lyrics') {
    openLyrics()
    return
  }

  openStory()
}

const shouldIgnoreKeydown = (event: KeyboardEvent) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return true
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || target.isContentEditable
}

const handleWindowKeydown = (event: KeyboardEvent) => {
  if (!props.isActive) return
  if (shouldIgnoreKeydown(event)) return

  if (event.key === 'Escape') {
    event.preventDefault()
    handleGlobalBack()
    return
  }

  if (activeSection.value !== 'entry') {
    return
  }

  const key = event.key.toLowerCase()

  if (key === 'm') {
    event.preventDefault()
    openMembers()
    return
  }

  if (key === 'l') {
    event.preventDefault()
    openLyrics()
    return
  }

  if (key === 's') {
    event.preventDefault()
    openStory()
  }
}

const handleOutsideCardPointerDown = (event: PointerEvent) => {
  if (!props.isActive) return

  const root = sectionsContainerRef.value
  const target = event.target
  if (!root || !(target instanceof HTMLElement)) return
  if (!root.contains(target)) return
  if (target.closest('[data-about-card]')) return

  handleGlobalBack()
}

watch(activeSection, (section) => {
  if (section === 'entry' && openStoryAfterEntry.value) {
    openStoryAfterEntry.value = false
    storyOpenSignal.value += 1
  }

  if (section !== 'entry') {
    isStoryOpen.value = false
    openStoryAfterEntry.value = false
  }

  if (section !== 'lyrics') {
    isLyricsDetailOpen.value = false
  }
})

watch(
  [activeSection, isStoryOpen, isLyricsDetailOpen],
  () => {
    emit('state-change', {
      activeSubmenu: activeSubmenu.value,
      canGoBack: showGlobalBackButton.value,
    })
  },
  { immediate: true }
)

watch(
  () => props.isActive,
  (isActive, wasActive) => {
    if (isActive && !wasActive) {
      resetAboutState()
    }
  },
  // flush: 'sync' ensures resetAboutState fires synchronously when isActive changes
  // (not in a deferred microtask), preventing it from racing with in-flight switchSection calls.
  { immediate: true, flush: 'sync' }
)

onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', handleWindowKeydown)
})

defineExpose({
  goBackOneStep,
  navigateToSubmenu,
})
</script>

<template>
  <section class="about-view" data-testid="about-view">
    <div
      ref="sectionsContainerRef"
      class="about-view__sections"
      @pointerdown.capture="handleOutsideCardPointerDown"
    >
      <div
        v-show="activeSection === 'entry'"
        class="about-view__section"
        data-about-section="entry"
      >
        <div class="about-view__carousel-shell">
          <div class="about-view__carousel" data-testid="about-entry-carousel">
            <div class="about-view__carousel-cell">
              <AboutEntryCard
                :key="`entry-${entryViewKey}`"
                :is-active="props.isActive && activeSection === 'entry'"
                :back-signal="storyBackSignal"
                :story-open-signal="storyOpenSignal"
                @open-members="openMembers"
                @open-lyrics="openLyrics"
                @story-open-change="isStoryOpen = $event"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        v-show="activeSection === 'members'"
        class="about-view__section"
        data-about-section="members"
      >
        <div class="about-view__carousel-shell">
          <AboutMembersView
            :key="`members-${membersViewKey}`"
            :is-active="props.isActive && activeSection === 'members'"
          />
        </div>
      </div>

      <div
        v-show="activeSection === 'lyrics'"
        class="about-view__section"
        data-about-section="lyrics"
      >
        <div class="about-view__carousel-shell">
          <LyricsCardsView
            :key="`lyrics-${lyricsViewKey}`"
            :is-active="props.isActive && activeSection === 'lyrics'"
            :back-signal="lyricsBackSignal"
            @detail-open-change="isLyricsDetailOpen = $event"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-view {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-x: clip;
}

.about-view__sections {
  width: min(100%, var(--about-track-max-width));
  margin-inline: auto;
  height: 100%;
  min-height: 0;
  position: relative;
  overflow-x: hidden;
}

.about-view__section {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  overflow-x: hidden;
}

.about-view__carousel-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.about-view__carousel {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  padding-inline: var(--about-track-inline-padding);
  scrollbar-width: none;
}

.about-view__carousel::-webkit-scrollbar {
  display: none;
}

.about-view__carousel-cell {
  flex: 0 0 min(var(--about-card-width-desktop), calc(100vw - 2rem));
  width: min(var(--about-card-width-desktop), calc(100vw - 2rem));
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
}
</style>
