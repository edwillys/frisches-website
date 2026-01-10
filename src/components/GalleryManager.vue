<template>
  <div class="gallery-layout" @click.stop>
    <!-- Left Rail (like Music album rail) -->
    <aside
      ref="railRef"
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
        data-testid="gallery-rail-toggle"
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
          <span v-if="showRailLabels" class="gallery-rail__label">Photos</span>
        </button>
        <button
          class="gallery-rail__item"
          :class="{ 'is-active': mode === 'Albums' }"
          type="button"
          @click="setMode('Albums')"
        >
          <i class="gallery-rail__icon pi pi-folder" aria-hidden="true" />
          <span v-if="showRailLabels" class="gallery-rail__label">Albums</span>
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
              ref="treeSelectRef"
              v-model="selectedTreeKeys"
              :options="filterTreeNodes"
              selectionMode="checkbox"
              placeholder="Filter"
              display="chip"
              filter
              filterPlaceholder="Search"
              appendTo="body"
              class="filter-select"
              @show="onFilterOverlayShow"
              @hide="onFilterOverlayHide"
            />
          </div>

          <button v-if="hasAnyFilters" class="btn-clear" type="button" @click="clearAll">
            Clear
          </button>

          <button
            class="btn-gear"
            type="button"
            aria-label="Display options"
            :data-carddealer-esc-block="isConfigOpen ? 'true' : undefined"
            @click.stop="toggleConfig"
          >
            <i class="pi pi-cog" aria-hidden="true" />
          </button>
        </div>

        <div
          v-if="mode === 'Albums' && currentAlbum"
          class="filters-bar__row filters-bar__row--album"
        >
          <button class="btn-back-album" type="button" @click.stop="closeAlbum">
            <i class="pi pi-arrow-left" aria-hidden="true" />
            Back to albums
          </button>
          <div class="album-title" :title="currentAlbum">{{ currentAlbum }}</div>
        </div>

        <div
          v-if="isConfigOpen"
          class="gallery-config-overlay"
          role="dialog"
          aria-label="Display options"
          :data-carddealer-esc-block="'true'"
          @click.self="closeConfig"
        >
          <div ref="configPanelRef" class="gallery-config-panel" tabindex="-1">
            <label class="gallery-config-row">
              <input
                type="checkbox"
                :checked="thumbnailLayoutSetting === 'square'"
                @change="toggleSquareThumbnails"
              />
              <span>Square (1:1)</span>
            </label>

            <label class="gallery-config-row">
              <input type="checkbox" v-model="timelineEnabledSetting" />
              <span>Timeline</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Photos Mode -->
      <div
        v-if="mode === 'Photos'"
        ref="galleryScrollRef"
        class="gallery-content"
        @scroll.passive="onGalleryScroll"
      >
        <div
          v-if="isTimelineEnabled && showFloatingMonthYear && floatingMonthYear && isScrolled"
          class="gallery-floating-date"
          aria-label="Current month"
        >
          {{ floatingMonthYear }}
        </div>

        <template v-for="group in photoGroups" :key="group.key">
          <div
            v-if="isTimelineEnabled && showMonthYearHeaders"
            class="gallery-month-header"
            :data-month-key="group.key"
          >
            {{ group.label }}
          </div>

          <div v-if="effectiveThumbnailLayout === 'masonry'" class="gallery-masonry">
            <div
              v-for="image in group.images"
              :key="image.id"
              :class="[
                'gallery-item',
                'gallery-item--masonry',
                { 'is-loaded': isImageLoaded(image.id) },
              ]"
              @click.stop="openLightbox(image.id)"
            >
              <div v-if="!isImageLoaded(image.id)" class="skeleton-loader" aria-hidden="true">
                <div class="skeleton-pulse"></div>
              </div>

              <img
                class="gallery-img gallery-img--masonry"
                :src="getImageSrc(image.relativePath)"
                :alt="''"
                loading="lazy"
                @load="onImageLoad(image.id)"
                @error="onImageError(image.id)"
              />
            </div>
          </div>

          <div v-else class="gallery-grid">
            <div
              v-for="image in group.images"
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
        </template>
      </div>

      <!-- Albums Mode -->
      <div v-else class="albums-content">
        <div v-if="!currentAlbum" class="albums-grid">
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

        <div v-else class="album-view">
          <div v-if="effectiveThumbnailLayout === 'masonry'" class="gallery-masonry">
            <div
              v-for="image in currentAlbumImages"
              :key="image.id"
              :class="[
                'gallery-item',
                'gallery-item--masonry',
                { 'is-loaded': isImageLoaded(image.id) },
              ]"
              @click.stop="openLightbox(image.id)"
            >
              <div v-if="!isImageLoaded(image.id)" class="skeleton-loader" aria-hidden="true">
                <div class="skeleton-pulse"></div>
              </div>

              <img
                class="gallery-img gallery-img--masonry"
                :src="getImageSrc(image.relativePath)"
                :alt="''"
                loading="lazy"
                @load="onImageLoad(image.id)"
                @error="onImageError(image.id)"
              />
            </div>
          </div>

          <div v-else class="gallery-grid">
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
    </main>
    <!-- Lightbox -->
    <Teleport to="body">
      <div v-if="lightboxImage" class="lightbox" @pointerdown.stop @click.self.stop="closeLightbox">
        <button
          class="lightbox-close"
          type="button"
          aria-label="Close"
          data-testid="gallery-lightbox-close"
          @click.stop="closeLightbox"
        >
          <span aria-hidden="true" v-html="closeSvg" />
        </button>
        <button
          class="lightbox-nav lightbox-prev"
          type="button"
          aria-label="Previous"
          @click.stop="prevImage"
        >
          <span aria-hidden="true" class="lightbox-nav__icon" v-html="arrowLeftSvg" />
        </button>
        <button
          class="lightbox-nav lightbox-next"
          type="button"
          aria-label="Next"
          @click.stop="nextImage"
        >
          <span
            aria-hidden="true"
            class="lightbox-nav__icon lightbox-nav__icon--next"
            v-html="arrowLeftSvg"
          />
        </button>

        <div class="lightbox-content">
          <div
            ref="lightboxMediaRef"
            class="lightbox-media"
            :class="{ 'is-zoomed': zoomScale > 1 }"
            @wheel.prevent="onLightboxWheel"
            @pointerdown="onMediaPointerDown"
            @pointermove="onMediaPointerMove"
            @pointerup="onMediaPointerUp"
            @pointercancel="onMediaPointerUp"
          >
            <img
              ref="lightboxImgRef"
              :src="getImageUrl(lightboxImage.relativePath)"
              :alt="lightboxImage.filename"
              :style="lightboxImgStyle"
              draggable="false"
            />
          </div>

          <div class="lightbox-controls" aria-label="Zoom controls">
            <button class="lightbox-ctrl" type="button" aria-label="Zoom out" @click.stop="zoomOut">
              <i class="pi pi-minus" aria-hidden="true" />
            </button>
            <button
              class="lightbox-ctrl"
              type="button"
              aria-label="Reset zoom"
              @click.stop="resetZoom"
            >
              <i class="pi pi-refresh" aria-hidden="true" />
            </button>
            <button class="lightbox-ctrl" type="button" aria-label="Zoom in" @click.stop="zoomIn">
              <i class="pi pi-plus" aria-hidden="true" />
            </button>
            <div class="lightbox-zoom" aria-label="Zoom level">
              {{ Math.round(zoomScale * 100) }}%
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import TreeSelect from 'primevue/treeselect'
import { useGalleryData, type ImageOptions } from '@/composables/useGalleryData'
import librarySplitSvg from '@/assets/icons/library-split.svg?raw'
import closeSvg from '@/assets/icons/close.svg?raw'
import arrowLeftSvg from '@/assets/icons/arrow-left.svg?raw'

type ThumbnailLayout = 'square' | 'masonry'

const props = withDefaults(
  defineProps<{
    thumbnailLayout?: ThumbnailLayout
    timelineEnabled?: boolean
    showMonthYearHeaders?: boolean
    showFloatingMonthYear?: boolean
    /**
     * Optional hierarchy overrides for flat tag names.
     * Example: { Proberaum: 'Show/Proberaum' }
     */
    tagHierarchyOverrides?: Record<string, string>
  }>(),
  {
    thumbnailLayout: 'masonry',
    timelineEnabled: true,
    showMonthYearHeaders: true,
    showFloatingMonthYear: false,
    // Sensible defaults for the current (flat) sample data.
    // When your generated gallery JSON includes real hierarchical tag paths,
    // these overrides are ignored automatically.
    tagHierarchyOverrides: () => ({
      Proberaum: 'Show/Proberaum',
      Eisenbahnbrücke: 'Show/Eisenbahnbrücke',
    }),
  }
)

const {
  filteredImages,
  filteredAlbums,
  allPeople,
  allLocations,
  allTags,
  availableYears,
  mode,
  selectedFilters,
  lightboxImage,
  hasActiveFilters,
  selectedYears,
  setMode,
  clearFilters,
  setYears,
  openLightbox,
  closeLightbox,
  nextImage,
  prevImage,
  getImagesForAlbum,
  resolveImage,
} = useGalleryData()

const treeSelectRef = ref(null)
const isFilterOverlayOpen = ref(false)

function focusTreeSelectFilterIfPresent() {
  // PrimeVue teleports overlay to body. Focus search input when opening.
  const input = document.querySelector(
    '.p-treeselect-overlay input, .p-treeselect-panel input, .p-treeselect-filter input'
  ) as HTMLInputElement | null
  input?.focus()
}

function onFilterOverlayShow() {
  isFilterOverlayOpen.value = true
  nextTick(() => {
    window.requestAnimationFrame(() => focusTreeSelectFilterIfPresent())
  })
}

function onFilterOverlayHide() {
  isFilterOverlayOpen.value = false
}

const thumbnailLayoutSetting = ref<ThumbnailLayout>(props.thumbnailLayout)
const timelineEnabledSetting = ref<boolean>(props.timelineEnabled)

const isConfigOpen = ref(false)
const configPanelRef = ref<HTMLElement | null>(null)

function openConfig() {
  isConfigOpen.value = true
  nextTick(() => configPanelRef.value?.focus())
}

function closeConfig() {
  isConfigOpen.value = false
}

function toggleConfig() {
  if (isConfigOpen.value) {
    closeConfig()
  } else {
    openConfig()
  }
}

function toggleSquareThumbnails() {
  thumbnailLayoutSetting.value = thumbnailLayoutSetting.value === 'square' ? 'masonry' : 'square'
}

const isRailExpanded = ref(false)
const showRailLabels = computed(() => isRailExpanded.value)

function toggleRail() {
  isRailExpanded.value = !isRailExpanded.value
}

type FilterTreeNode = {
  key: string
  label: string
  icon?: string
  leaf?: boolean
  selectable?: boolean
  children?: FilterTreeNode[]
}

const selectedTreeKeys = ref<Record<string, boolean | { checked?: boolean }>>({})

const hasHierarchicalTagPaths = computed(() => allTags.value.some((t) => t.includes('/')))
const hasHierarchicalLocationPaths = computed(() => allLocations.value.some((l) => l.includes('/')))

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

function insertPathKeyed(
  rootChildren: FilterTreeNode[],
  segments: string[],
  keyPrefix: 'tag' | 'location'
) {
  let current = rootChildren
  let path = ''

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!.trim()
    if (!segment) continue
    path = path ? `${path}/${segment}` : segment
    const nodeKey = `${keyPrefix}:${path}`
    const isLeaf = i === segments.length - 1

    let node = current.find((c) => c.key === nodeKey)
    if (!node) {
      node = {
        key: nodeKey,
        label: segment,
        leaf: isLeaf,
        selectable: isLeaf,
        children: isLeaf ? undefined : [],
      }
      current.push(node)
    }

    if (!isLeaf) {
      if (!node.children) node.children = []
      current = node.children
    }
  }
}

const filterTreeNodes = computed<FilterTreeNode[]>(() => {
  const peopleRoot: FilterTreeNode = {
    key: 'root:people',
    label: 'People',
    icon: 'pi pi-user',
    selectable: false,
    children: [],
  }

  const locationRoot: FilterTreeNode = {
    key: 'root:location',
    label: 'Location',
    icon: 'pi pi-map-marker',
    selectable: false,
    children: [],
  }

  const tagsRoot: FilterTreeNode = {
    key: 'root:tags',
    label: 'Tags',
    icon: 'pi pi-tags',
    selectable: false,
    children: [],
  }

  const dateRoot: FilterTreeNode = {
    key: 'root:date',
    label: 'Date',
    icon: 'pi pi-calendar',
    selectable: false,
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
    if (hasHierarchicalLocationPaths.value) {
      insertPathKeyed(locationRoot.children!, segments, 'location')
    } else {
      insertPath(locationRoot.children!, segments, `location:${loc}`, 'location')
    }
  }

  // Tags (everything else) are displayed hierarchically.
  const normalTags = allTags.value.filter(
    (t) => !t.startsWith('Location/') && !t.startsWith('People/')
  )
  for (const t of normalTags) {
    const override = hasHierarchicalTagPaths.value ? undefined : props.tagHierarchyOverrides?.[t]
    const segments = (override || t)
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!segments.length) continue

    if (hasHierarchicalTagPaths.value) {
      insertPathKeyed(tagsRoot.children!, segments, 'tag')
    } else {
      // Keep leafKey stable so existing flat-tag datasets still filter correctly.
      insertPath(tagsRoot.children!, segments, `tag:${t}`, 'tag')
    }
  }

  // Date (years)
  for (const y of availableYears.value) {
    dateRoot.children!.push({ key: `date:${y}`, label: String(y), leaf: true })
  }

  return [peopleRoot, locationRoot, tagsRoot, dateRoot]
})

const hasAnyFilters = computed(() => {
  return hasActiveFilters.value || selectedYears.value.length > 0
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

// Image URL resolution with reactive caching.
// IMPORTANT: don't track pending loads in a reactive ref.
// If resolveImage() returns '' (missing file), a reactive pending Set will
// repeatedly trigger re-renders and re-requests (can hang Firefox).
const imageCache = ref<Map<string, string>>(new Map())
const imagePending = new Set<string>()
const imageLoaded = ref<Set<number>>(new Set())

function getImageUrl(relativePath: string, options?: ImageOptions): string {
  if (!relativePath) return ''
  const cacheKey = JSON.stringify({ relativePath, options })

  if (imageCache.value.has(cacheKey)) {
    return imageCache.value.get(cacheKey)!
  }

  if (imagePending.has(cacheKey)) {
    return ''
  }

  imagePending.add(cacheKey)

  // Load async and trigger reactivity when ready
  resolveImage(relativePath).then((url) => {
    // Cache even empty results so missing files don't trigger endless retries.
    imageCache.value.set(cacheKey, url || '')
    if (url) {
      // Trigger reactivity only when there's a real URL to render.
      imageCache.value = new Map(imageCache.value)
    }

    imagePending.delete(cacheKey)
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
  if (event.key === 'Escape') {
    if (isConfigOpen.value) {
      event.preventDefault()
      event.stopPropagation()
      closeConfig()
      return
    }

    // If the filter overlay is open, PrimeVue will close it on Escape.
    // We still stop propagation so CardDealer doesn't navigate back.
    if (isFilterOverlayOpen.value) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (lightboxImage.value) {
      event.preventDefault()
      event.stopPropagation()
      closeLightbox()
      return
    }
  }

  if (!lightboxImage.value) return
  switch (event.key) {
    case 'ArrowLeft':
      prevImage()
      break
    case 'ArrowRight':
      nextImage()
      break
  }
}

// Format year-month for display
function clearAll() {
  clearFilters()
  selectedTreeKeys.value = {}
}

function isKeyChecked(
  selectionKeys: Record<string, boolean | { checked?: boolean }>,
  key: string
): boolean {
  const v = selectionKeys[key]
  return v === true || (typeof v === 'object' && v?.checked === true)
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

    const years = tokens
      .filter((t) => t.startsWith('date:'))
      .map((t) => Number(t.slice('date:'.length)))
      .filter((n) => Number.isFinite(n))
    setYears(years)
  },
  { deep: true }
)
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const isTimelineEnabled = computed(() => timelineEnabledSetting.value)

const effectiveThumbnailLayout = computed<ThumbnailLayout>(() => {
  // Keep layout independent from timeline.
  return thumbnailLayoutSetting.value
})

type PhotoGroup = { key: string; label: string; images: typeof filteredImages.value }

function formatMonthYear(key: string) {
  // key = YYYY-MM
  const [y, m] = key.split('-')
  const year = Number(y)
  const monthIdx = Math.max(0, Math.min(11, Number(m) - 1))
  const date = new Date(year, monthIdx, 1)
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(date)
}

const photoGroups = computed<PhotoGroup[]>(() => {
  if (!isTimelineEnabled.value) {
    return [{ key: 'all', label: '', images: filteredImages.value }]
  }

  const map = new Map<string, typeof filteredImages.value>()
  for (const img of filteredImages.value) {
    const date = img.creationDate ? new Date(img.creationDate) : null
    const key = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(img)
  }

  const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a))
  return keys.map((key) => ({
    key,
    label: key === 'unknown' ? 'Unknown date' : formatMonthYear(key),
    images: map.get(key)!,
  }))
})

const galleryScrollRef = ref<HTMLElement | null>(null)
const floatingMonthYear = ref<string>('')
const isScrolled = ref(false)

function onGalleryScroll() {
  const el = galleryScrollRef.value
  if (!el) return

  isScrolled.value = el.scrollTop > 24

  if (!isTimelineEnabled.value) {
    floatingMonthYear.value = ''
    return
  }
  // Find the last month header above the scroll position.
  const headers = el.querySelectorAll<HTMLElement>('.gallery-month-header')
  let active: HTMLElement | null = null
  for (const h of Array.from(headers)) {
    if (h.offsetTop - el.scrollTop <= 40) active = h
  }
  const key = active?.dataset.monthKey
  floatingMonthYear.value = key && key !== 'unknown' ? formatMonthYear(key) : ''
}

watch(
  () => props.timelineEnabled,
  async () => {
    await nextTick()
    onGalleryScroll()
  }
)

// ==================== Lightbox zoom/pan ====================
const zoomScale = ref(1)
const panX = ref(0)
const panY = ref(0)

const lightboxMediaRef = ref<HTMLElement | null>(null)
const lightboxImgRef = ref<HTMLImageElement | null>(null)

const MIN_ZOOM = 1
const MAX_ZOOM = 5

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function getZoomMetrics() {
  const container = lightboxMediaRef.value
  const img = lightboxImgRef.value
  if (!container || !img || !img.naturalWidth || !img.naturalHeight) return null

  const rect = container.getBoundingClientRect()
  const containerW = rect.width
  const containerH = rect.height

  const fitScale = Math.min(containerW / img.naturalWidth, containerH / img.naturalHeight)
  const baseW = img.naturalWidth * fitScale
  const baseH = img.naturalHeight * fitScale

  return { rect, containerW, containerH, baseW, baseH }
}

function clampPan() {
  const m = getZoomMetrics()
  if (!m) return

  if (zoomScale.value <= 1) {
    panX.value = 0
    panY.value = 0
    return
  }

  const scaledW = m.baseW * zoomScale.value
  const scaledH = m.baseH * zoomScale.value

  const maxX = Math.max(0, (scaledW - m.containerW) / 2)
  const maxY = Math.max(0, (scaledH - m.containerH) / 2)

  panX.value = maxX === 0 ? 0 : clamp(panX.value, -maxX, maxX)
  panY.value = maxY === 0 ? 0 : clamp(panY.value, -maxY, maxY)
}

function zoomAtClientPoint(
  nextUnclamped: number,
  clientX: number,
  clientY: number,
  start?: { zoom: number; panX: number; panY: number }
) {
  const m = getZoomMetrics()
  const fromZoom = start?.zoom ?? zoomScale.value
  const fromPanX = start?.panX ?? panX.value
  const fromPanY = start?.panY ?? panY.value

  const next = clamp(nextUnclamped, MIN_ZOOM, MAX_ZOOM)
  if (next === 1) {
    zoomScale.value = 1
    panX.value = 0
    panY.value = 0
    return
  }

  if (!m || fromZoom <= 0) {
    zoomScale.value = next
    clampPan()
    return
  }

  const k = next / fromZoom
  const centerX = m.rect.left + m.containerW / 2
  const centerY = m.rect.top + m.containerH / 2
  const cursorOffsetX = clientX - centerX
  const cursorOffsetY = clientY - centerY

  zoomScale.value = next
  panX.value = cursorOffsetX * (1 - k) + fromPanX * k
  panY.value = cursorOffsetY * (1 - k) + fromPanY * k
  clampPan()
}

function zoomToCentered(next: number) {
  const m = getZoomMetrics()
  if (!m) {
    zoomScale.value = clamp(next, MIN_ZOOM, MAX_ZOOM)
    clampPan()
    return
  }
  zoomAtClientPoint(next, m.rect.left + m.containerW / 2, m.rect.top + m.containerH / 2)
}

function zoomIn() {
  zoomToCentered(zoomScale.value * 1.2)
}

function zoomOut() {
  zoomToCentered(zoomScale.value / 1.2)
}

function resetZoom() {
  zoomScale.value = 1
  panX.value = 0
  panY.value = 0
}

function onLightboxWheel(event: WheelEvent) {
  const delta = -event.deltaY
  const factor = delta > 0 ? 1.08 : 0.92
  zoomAtClientPoint(zoomScale.value * factor, event.clientX, event.clientY)
}

const pointers = new Map<number, { x: number; y: number }>()
let pinchStartDistance = 0
let pinchStartZoom = 1
let pinchStartPan = { x: 0, y: 0 }
let dragStart: { x: number; y: number; panX: number; panY: number } | null = null

function getDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

function onMediaPointerDown(e: PointerEvent) {
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size === 2) {
    const [p1, p2] = Array.from(pointers.values())
    pinchStartDistance = getDistance(p1!, p2!)
    pinchStartZoom = zoomScale.value
    pinchStartPan = { x: panX.value, y: panY.value }
    dragStart = null
    return
  }

  if (zoomScale.value > 1) {
    dragStart = { x: e.clientX, y: e.clientY, panX: panX.value, panY: panY.value }
  }
}

function onMediaPointerMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size === 2) {
    const [p1, p2] = Array.from(pointers.values())
    const d = getDistance(p1!, p2!)
    if (pinchStartDistance > 0) {
      const midX = (p1!.x + p2!.x) / 2
      const midY = (p1!.y + p2!.y) / 2
      zoomAtClientPoint(pinchStartZoom * (d / pinchStartDistance), midX, midY, {
        zoom: pinchStartZoom,
        panX: pinchStartPan.x,
        panY: pinchStartPan.y,
      })
    }
    return
  }

  if (dragStart && zoomScale.value > 1) {
    panX.value = dragStart.panX + (e.clientX - dragStart.x)
    panY.value = dragStart.panY + (e.clientY - dragStart.y)
    clampPan()
  }
}

function onMediaPointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) {
    pinchStartDistance = 0
  }
  if (pointers.size === 0) {
    dragStart = null
  }
}

const lightboxImgStyle = computed(() => {
  const t = `translate3d(${panX.value}px, ${panY.value}px, 0) scale(${zoomScale.value})`
  return {
    transform: t,
  }
})

watch(
  lightboxImage,
  () => {
    // Reset zoom whenever opening/changing the image.
    resetZoom()
  },
  { flush: 'post' }
)
</script>

<style scoped lang="scss">
/* Match the site's "music" layout + design tokens */
.gallery-layout {
  position: absolute;
  inset: 0;
  display: flex;
  width: 100%;
  height: 100%;
  background: transparent;
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
  overflow-x: hidden;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  transition: width 0.3s ease;
  box-sizing: border-box;
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
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-base);
  box-sizing: border-box;
}

.gallery-rail__toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.gallery-rail__toggle :deep(svg) {
  width: 24px;
  height: 24px;
  display: block;
}

.gallery-rail__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-x: hidden;
}

.gallery-rail__item {
  width: 100%;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0;
  border-radius: 8px;
  transition: background var(--transition-base);
  color: var(--color-text);
  box-sizing: border-box;
}

.gallery-rail.is-expanded .gallery-rail__item {
  justify-content: flex-start;
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

.btn-gear {
  margin-left: auto;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-gear:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-gear .pi {
  font-size: 18px;
  line-height: 1;
}

.gallery-config-overlay {
  position: fixed;
  inset: 0;
  z-index: 10002;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 68px 14px 14px;
}

.gallery-config-panel {
  width: min(260px, calc(100vw - 28px));
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.75);
  box-shadow: 0 14px 50px rgba(0, 0, 0, 0.45);
  padding: 10px 12px;
  outline: none;
}

.filters-bar__row--album {
  gap: 10px;
  padding-top: 2px;
}

.btn-back-album {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.95);
  cursor: pointer;
}

.btn-back-album:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-back-album .pi {
  font-size: 16px;
  line-height: 1;
}

.album-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.gallery-config-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.9);
  user-select: none;
}

.gallery-config-row:hover {
  background: rgba(255, 255, 255, 0.06);
}

.gallery-config-row input {
  width: 16px;
  height: 16px;
}

/* Content */
.gallery-content {
  flex: 1;
  overflow: auto;
  position: relative;
}

.gallery-floating-date {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 3;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  letter-spacing: 0.02em;
}

.gallery-month-header {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  padding: 12px;
}

.gallery-masonry {
  column-count: 4;
  column-gap: 10px;
  padding: 12px;
}

@media (max-width: 1200px) {
  .gallery-masonry {
    column-count: 3;
  }
}

@media (max-width: 900px) {
  .gallery-masonry {
    column-count: 2;
  }
}

@media (max-width: 600px) {
  .gallery-masonry {
    column-count: 1;
  }
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
}

.gallery-item--masonry {
  aspect-ratio: auto;
  display: inline-block;
  width: 100%;
  margin: 0 0 10px;
  break-inside: avoid;
}

.gallery-item:hover {
  border-color: var(--color-neon-magenta);
  box-shadow: 0 0 18px color-mix(in srgb, var(--color-neon-magenta) 30%, transparent);
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

.gallery-img--masonry {
  height: auto;
  object-fit: contain;
  display: block;
}

.gallery-item.is-loaded .gallery-img {
  opacity: 1;
}

/* Skeleton */
.skeleton-loader {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.03);
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
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.album-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.album-thumbnail {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: transparent;
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
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);
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
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
}

.lightbox-close :deep(svg) {
  width: 18px;
  height: 18px;
  display: block;
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
  display: flex;
  align-items: center;
  justify-content: center;
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

.lightbox-nav__icon :deep(svg) {
  width: 18px;
  height: 18px;
  display: block;
}

.lightbox-nav__icon--next {
  transform: rotate(180deg);
}

.lightbox-content {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.lightbox-media {
  width: min(90vw, 1200px);
  height: min(80vh, 760px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  touch-action: none;
}

.lightbox-media img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transform-origin: center;
  user-select: none;
}

.lightbox-media.is-zoomed {
  cursor: grab;
}

.lightbox-media.is-zoomed:active {
  cursor: grabbing;
}

.lightbox-controls {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(12px);
}

.lightbox-ctrl {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lightbox-ctrl:hover {
  border-color: color-mix(in srgb, var(--color-neon-magenta) 55%, rgba(255, 255, 255, 0.14));
  box-shadow: 0 0 16px color-mix(in srgb, var(--color-neon-magenta) 25%, transparent);
}

.lightbox-zoom {
  min-width: 56px;
  text-align: right;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}
</style>
