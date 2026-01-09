<template>
  <div class="gallery-layout" @click.stop>
    <!-- Left Rail (like Music album rail) -->
    <aside
      class="gallery-rail"
      :class="{ 'is-expanded': isRailExpanded }"
      aria-label="Gallery mode"
    >
      <button
        class="gallery-rail__toggle"
        type="button"
        :aria-label="isRailExpanded ? 'Collapse gallery sidebar' : 'Expand gallery sidebar'"
        @click.stop="toggleRail"
        :data-tooltip="isRailExpanded ? 'Collapse library' : 'Expand library'"
      >
        <span aria-hidden="true" v-html="librarySplitSvg" />
      </button>

      <div class="gallery-rail__list">
        <button
          class="gallery-rail__item"
          :class="{ 'is-active': mode === 'Photos' }"
          type="button"
          @click="setMode('Photos')"
        >
          <i class="gallery-rail__icon pi pi-images" aria-hidden="true" />
          <span v-if="isRailExpanded" class="gallery-rail__label">Photos</span>
        </button>
        <button
          class="gallery-rail__item"
          :class="{ 'is-active': mode === 'Albums' }"
          type="button"
          @click="setMode('Albums')"
        >
          <i class="gallery-rail__icon pi pi-folder" aria-hidden="true" />
          <span v-if="isRailExpanded" class="gallery-rail__label">Albums</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="gallery-main" data-testid="gallery-manager">
      <!-- Filters Bar -->
      <div class="filters-bar">
        <div class="filters-bar__row">
          <div class="filter-group">
            <TreeSelect
              v-model="selectedTreeKeys"
              :options="filterTreeNodes"
              selectionMode="checkbox"
              placeholder="Filter"
              display="chip"
              :maxSelectedLabels="3"
              filter
              filterPlaceholder="Search"
              appendTo="body"
              class="filter-select"
            />
          </div>

          <div class="filter-group">
            <DatePicker
              v-model="selectedYearDate"
              view="year"
              dateFormat="yy"
              placeholder="Year"
              showClear
              appendTo="body"
              class="filter-select"
            />
          </div>

          <button v-if="hasAnyFilters" class="btn-clear" type="button" @click="clearAll">
            Clear
          </button>
        </div>
      </div>

      <!-- Photos Mode -->
      <div v-if="mode === 'Photos'" class="gallery-content">
        <div class="gallery-grid">
          <div
            v-for="image in filteredImages"
            :key="image.id"
            :class="['gallery-item', { 'is-loaded': isImageLoaded(image.id) }]"
            @click.stop="openLightbox(image.id)"
          >
            <div v-if="!isImageLoaded(image.id)" class="skeleton-loader" aria-hidden="true">
              <div class="skeleton-pulse"></div>
            </div>

            <img
              class="gallery-img"
              :src="getImageSrc(image.relativePath)"
              :alt="''"
              loading="lazy"
              @load="onImageLoad(image.id)"
              @error="onImageError(image.id)"
            />
          </div>
        </div>
      </div>

      <!-- Albums Mode -->
      <div v-else class="albums-content">
        <div class="albums-grid">
          <div
            v-for="album in filteredAlbums"
            :key="album"
            class="album-card"
            @click.stop="openAlbum(album)"
          >
            <div class="album-thumbnail">
              <div v-if="!getAlbumCover(album)" class="album-placeholder">
                <span class="album-icon">📁</span>
              </div>
              <img v-else :src="getImageUrl(getAlbumCover(album)!)" :alt="album" loading="lazy" />
            </div>
            <div class="album-info">
              <h3>{{ album }}</h3>
              <span class="album-count">{{ getAlbumImageCount(album) }} photos</span>
            </div>
          </div>
        </div>

        <!-- Album View (within Albums mode) -->
        <div v-if="currentAlbum" class="album-view-modal">
          <div class="album-view">
            <div class="album-header">
              <button class="back-button" type="button" @click.stop="closeAlbum">
                <span class="back-icon">←</span>
                Back
              </button>
              <h2>{{ currentAlbum }}</h2>
            </div>
            <div class="gallery-grid">
              <div
                v-for="image in currentAlbumImages"
                :key="image.id"
                :class="['gallery-item', { 'is-loaded': isImageLoaded(image.id) }]"
                @click.stop="openLightbox(image.id)"
              >
                <div v-if="!isImageLoaded(image.id)" class="skeleton-loader" aria-hidden="true">
                  <div class="skeleton-pulse"></div>
                </div>

                <img
                  class="gallery-img"
                  :src="getImageSrc(image.relativePath)"
                  :alt="''"
                  loading="lazy"
                  @load="onImageLoad(image.id)"
                  @error="onImageError(image.id)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    <!-- Lightbox -->
    <Teleport to="body">
      <div v-if="lightboxImage" class="lightbox" @pointerdown.stop @click.self.stop="closeLightbox">
        <button class="lightbox-close" type="button" @click.stop="closeLightbox">✕</button>
        <button class="lightbox-nav lightbox-prev" type="button" @click.stop="prevImage">‹</button>
        <button class="lightbox-nav lightbox-next" type="button" @click.stop="nextImage">›</button>

        <div class="lightbox-content">
          <img :src="getImageUrl(lightboxImage.relativePath)" :alt="lightboxImage.filename" />
          <div class="lightbox-info">
            <div class="lightbox-meta">
              <span v-if="lightboxImage.people.length"
                >👥 {{ lightboxImage.people.join(', ') }}</span
              >
              <span v-if="getImageLocationLabels(lightboxImage).length"
                >📍 {{ getImageLocationLabels(lightboxImage).join(', ') }}</span
              >
              <span v-if="lightboxImage.tags.length">🏷️ {{ lightboxImage.tags.join(', ') }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import TreeSelect from 'primevue/treeselect'
import DatePicker from 'primevue/datepicker'
import { useGalleryData, type ImageOptions } from '@/composables/useGalleryData'
import librarySplitSvg from '@/assets/icons/library-split.svg?raw'

const {
  filteredImages,
  filteredAlbums,
  allPeople,
  allLocations,
  allTags,
  mode,
  selectedFilters,
  lightboxImage,
  hasActiveFilters,
  selectedYear,
  setMode,
  clearFilters,
  setYear,
  openLightbox,
  closeLightbox,
  nextImage,
  prevImage,
  getImagesForAlbum,
  getImageLocationLabels,
  resolveImage,
} = useGalleryData()

const isRailExpanded = ref(false)
function toggleRail() {
  isRailExpanded.value = !isRailExpanded.value
}

type FilterTreeNode = {
  key: string
  label: string
  icon?: string
  leaf?: boolean
  children?: FilterTreeNode[]
}

const selectedTreeKeys = ref<Record<string, boolean | { checked?: boolean }>>({})

function insertPath(
  rootChildren: FilterTreeNode[],
  segments: string[],
  leafKey: string,
  groupPrefix: string
) {
  let current = rootChildren
  let path = ''

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!.trim()
    if (!segment) continue

    path = path ? `${path}/${segment}` : segment
    const isLeaf = i === segments.length - 1
    const nodeKey = isLeaf ? leafKey : `${groupPrefix}-group:${path}`

    let node = current.find((c) => c.key === nodeKey)
    if (!node) {
      node = {
        key: nodeKey,
        label: segment,
        leaf: isLeaf,
        children: isLeaf ? undefined : [],
      }
      current.push(node)
    }

    if (!isLeaf) current = node.children!
  }
}

const filterTreeNodes = computed<FilterTreeNode[]>(() => {
  const peopleRoot: FilterTreeNode = {
    key: 'root:people',
    label: 'People',
    icon: 'pi pi-user',
    children: [],
  }

  const locationRoot: FilterTreeNode = {
    key: 'root:location',
    label: 'Location',
    icon: 'pi pi-map-marker',
    children: [],
  }

  const tagsRoot: FilterTreeNode = {
    key: 'root:tags',
    label: 'Tags',
    icon: 'pi pi-tags',
    children: [],
  }

  // People (flat)
  for (const p of allPeople.value) {
    peopleRoot.children!.push({ key: `people:${p}`, label: p, leaf: true })
  }

  // Location is derived from hierarchical tags (Location/...)
  for (const loc of allLocations.value) {
    const segments = loc
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!segments.length) continue
    insertPath(locationRoot.children!, segments, `location:${loc}`, 'location')
  }

  // Tags (everything else) are displayed hierarchically
  const normalTags = allTags.value.filter(
    (t) => !t.startsWith('Location/') && !t.startsWith('People/')
  )
  for (const t of normalTags) {
    const segments = t
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!segments.length) continue
    insertPath(tagsRoot.children!, segments, `tag:${t}`, 'tag')
  }

  return [peopleRoot, locationRoot, tagsRoot]
})

const selectedYearDate = ref<Date | null>(null)

const hasAnyFilters = computed(() => {
  return hasActiveFilters.value || selectedYear.value !== null
})

// Album view state
const currentAlbum = ref<string | null>(null)

const currentAlbumImages = computed(() => {
  if (!currentAlbum.value) return []
  return getImagesForAlbum(currentAlbum.value)
})

function openAlbum(albumName: string) {
  currentAlbum.value = albumName
}

function closeAlbum() {
  currentAlbum.value = null
}

function getAlbumImageCount(albumName: string): number {
  return getImagesForAlbum(albumName).length
}

function getAlbumCover(albumName: string): string | null {
  const images = getImagesForAlbum(albumName)
  return images.length > 0 ? images[0]?.relativePath || null : null
}

// Image URL resolution with reactive caching
const imageCache = ref<Map<string, string>>(new Map())
const imagePending = ref<Set<string>>(new Set())
const imageLoaded = ref<Set<number>>(new Set())

function getImageUrl(relativePath: string, options?: ImageOptions): string {
  const cacheKey = JSON.stringify({ relativePath, options })

  if (imageCache.value.has(cacheKey)) {
    return imageCache.value.get(cacheKey)!
  }

  if (imagePending.value.has(cacheKey)) {
    return ''
  }

  imagePending.value.add(cacheKey)
  imagePending.value = new Set(imagePending.value)

  // Load async and trigger reactivity when ready
  resolveImage(relativePath).then((url) => {
    if (url) {
      imageCache.value.set(cacheKey, url)
      // Trigger reactivity
      imageCache.value = new Map(imageCache.value)
    }

    imagePending.value.delete(cacheKey)
    imagePending.value = new Set(imagePending.value)
  })

  // Return cached or empty while loading
  return imageCache.value.get(cacheKey) || ''
}

function getImageSrc(relativePath: string, options?: ImageOptions): string | undefined {
  const url = getImageUrl(relativePath, options)
  return url || undefined
}

function onImageLoad(imageId: number) {
  imageLoaded.value.add(imageId)
  imageLoaded.value = new Set(imageLoaded.value)
}

function onImageError(imageId: number) {
  // Keep skeleton off for broken images, but don't block UI.
  imageLoaded.value.add(imageId)
  imageLoaded.value = new Set(imageLoaded.value)
}

function isImageLoaded(imageId: number): boolean {
  return imageLoaded.value.has(imageId)
}

// Keyboard navigation for lightbox
function handleKeydown(event: KeyboardEvent) {
  if (!lightboxImage.value) return

  switch (event.key) {
    case 'ArrowLeft':
      prevImage()
      break
    case 'ArrowRight':
      nextImage()
      break
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      closeLightbox()
      break
  }
}

// Format year-month for display
function clearAll() {
  clearFilters()
  selectedTreeKeys.value = {}
  selectedYearDate.value = null
  setYear(null)
}

function isKeyChecked(
  selectionKeys: Record<string, boolean | { checked?: boolean }>,
  key: string
): boolean {
  const v = selectionKeys[key]
  return v === true || v?.checked === true
}

function collectCheckedLeafTokens(
  nodes: FilterTreeNode[],
  selectionKeys: Record<string, boolean | { checked?: boolean }>
): string[] {
  const tokens = new Set<string>()

  function walk(node: FilterTreeNode, parentChecked: boolean) {
    const selfChecked = parentChecked || isKeyChecked(selectionKeys, node.key)

    if (node.leaf) {
      if (selfChecked) tokens.add(node.key)
      return
    }

    if (!node.children?.length) return
    for (const child of node.children) walk(child, selfChecked)
  }

  for (const n of nodes) walk(n, false)
  return Array.from(tokens)
}

watch(
  [selectedTreeKeys, filterTreeNodes],
  () => {
    const tokens = collectCheckedLeafTokens(filterTreeNodes.value, selectedTreeKeys.value)
    selectedFilters.value.people = tokens
      .filter((t) => t.startsWith('people:'))
      .map((t) => t.slice('people:'.length))
    selectedFilters.value.tags = tokens
      .filter((t) => t.startsWith('tag:'))
      .map((t) => t.slice('tag:'.length))
    selectedFilters.value.location = tokens
      .filter((t) => t.startsWith('location:'))
      .map((t) => t.slice('location:'.length))
  },
  { deep: true }
)

watch(
  selectedYearDate,
  (date) => {
    const year = date ? date.getFullYear() : null
    setYear(year)
  },
  { deep: false }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
/* Match the site's "music" layout + design tokens */
.gallery-layout {
  position: absolute;
  inset: 0;
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--color-background);
  color: var(--color-text);
  overflow: hidden;
  pointer-events: auto;
}

/* Left Rail */
.gallery-rail {
  width: 72px;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 8px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  transition: width 0.3s ease;
}

.gallery-rail.is-expanded {
  width: 240px;
}

.gallery-rail__toggle {
  width: 100%;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-base);
}

.gallery-rail__toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.gallery-rail__toggle :deep(svg) {
  width: 24px;
  height: 24px;
  fill: currentColor;
  stroke: currentColor;
}

.gallery-rail__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gallery-rail__item {
  width: 100%;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background var(--transition-base);
  color: var(--color-text);
}

.gallery-rail.is-expanded .gallery-rail__item {
  justify-content: flex-start;
  gap: 12px;
  padding: 0 12px;
}

.gallery-rail__item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.gallery-rail__item.is-active {
  background: rgba(255, 255, 255, 0.15);
}

.gallery-rail__icon {
  font-size: 18px;
  line-height: 1;
}

.gallery-rail__label {
  font-size: 14px;
  color: var(--color-text);
  opacity: 0.95;
}

/* Main */
.gallery-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Filters bar */
.filters-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(10px);
}

.filters-bar__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  min-width: 180px;
}

.btn-clear {
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text);
}

.btn-clear:hover {
  background: rgba(255, 255, 255, 0.1);
}

.filter-select {
  width: 100%;
}

/* Content */
.gallery-content {
  flex: 1;
  overflow: auto;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  padding: 12px;
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
}

.gallery-item:hover {
  border-color: var(--color-accent);
  box-shadow: var(--color-social-accent-glow);
}

.gallery-item.selected {
  outline: 2px solid rgba(255, 255, 255, 0.22);
  outline-offset: -2px;
}

.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.gallery-item.is-loaded .gallery-img {
  opacity: 1;
}

/* Skeleton */
.skeleton-loader {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.04);
}

.skeleton-pulse {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.09) 50%,
    rgba(255, 255, 255, 0.04) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.4s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Albums */
.albums-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.album-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.album-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.album-thumbnail {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
}

.album-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.35);
}

.album-icon {
  font-size: 40px;
}

.album-info {
  padding: 12px;
}

.album-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.album-count {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* ==================== Album View Modal ==================== */
.album-view-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--color-background);
  overflow-y: auto;
}

.album-view {
  padding: 1.5rem;
}

.album-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--color-text);
  }
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.09);
  }
}

.back-icon {
  font-size: 1.25rem;
}

/* ==================== Lightbox ==================== */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.95);
}

.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 3rem;
  height: 3rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10001;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 3rem;
  height: 3rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10001;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &.lightbox-prev {
    left: 1rem;
  }

  &.lightbox-next {
    right: 1rem;
  }
}

.lightbox-content {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 4px;
  }
}

.lightbox-info {
  text-align: center;
  color: white;

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 500;
  }
}

.lightbox-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  font-size: 0.875rem;
  opacity: 0.9;
}
</style>
