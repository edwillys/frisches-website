/**
 * useGalleryData.ts
 *
 * Composable for managing gallery state, filters, and image resolution.
 * Loads metadata from gallery_data.json and resolves images via import.meta.glob.
 */

import { ref, computed } from 'vue'
import galleryDataJson from '@/assets/gallery_data.json'

export interface GalleryImage {
  id: number
  filename: string
  relativePath: string
  albumName: string
  tags: string[]
  people: string[]
  location: string[]
  rating: number
  creationDate: string | null
}

const LOCATION_TAG_PREFIX = 'Location/'

function getLocationPathsFromTags(tags: string[]): string[] {
  const paths = new Set<string>()
  for (const tag of tags) {
    if (!tag.startsWith(LOCATION_TAG_PREFIX)) continue
    const remainder = tag.slice(LOCATION_TAG_PREFIX.length).trim()
    if (!remainder) continue
    paths.add(remainder)
  }
  return Array.from(paths).sort()
}

function getLocationPathsFromImage(image: GalleryImage): string[] {
  // Preferred source: explicit location paths from generator.
  const paths = new Set<string>()

  for (const l of image.location || []) {
    const cleaned = String(l).trim()
    if (cleaned) paths.add(cleaned)
  }

  // Backward compatibility: older gallery_data.json stored locations as Location/... tags.
  getLocationPathsFromTags(image.tags || []).forEach((p) => paths.add(p))

  return Array.from(paths).sort()
}

function locationPathToLabel(path: string): string {
  const parts = path
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.length ? parts[parts.length - 1]! : path
}

export type GalleryMode = 'Photos' | 'Albums'

export interface ImageOptions {
  width?: number
  height?: number
  format?: 'webp' | 'avif' | 'jpg' | 'png'
  quality?: number
}

// Import all images from the gallery directory
// Returns a record of { [path]: () => Promise<{ default: string }> }
const imageModules = import.meta.glob<{ default: string }>(
  '/src/assets/private/images/gallery/**/*.{jpg,jpeg,png,gif,webp,JPG,JPEG,PNG,GIF,WEBP}',
  { eager: false }
)

// Build a normalized path lookup map for fast matching
const imagePathMap = new Map<string, string>()
Object.keys(imageModules).forEach((path) => {
  // Normalize: strip /src/assets/private/images/gallery/ prefix and normalize slashes
  const normalized = path
    .replace(/^\/src\/assets\/private\/images\/gallery\//, '')
    .replace(/\\/g, '/')
    .toLowerCase()
  imagePathMap.set(normalized, path)
})

export function useGalleryData() {
  const galleryData = ref<GalleryImage[]>(galleryDataJson as GalleryImage[])
  const mode = ref<GalleryMode>('Photos')
  const selectedFilters = ref<{
    people: string[]
    location: string[]
    tags: string[]
  }>({
    people: [],
    location: [],
    tags: [],
  })
  const selectedImageId = ref<number | null>(null)
  const lightboxImageId = ref<number | null>(null)

  // ==================== Indexes ====================

  const albums = computed(() => {
    const albumSet = new Set<string>()
    galleryData.value.forEach((img) => albumSet.add(img.albumName))
    return Array.from(albumSet).sort()
  })

  const allPeople = computed(() => {
    const peopleSet = new Set<string>()
    galleryData.value.forEach((img) => img.people.forEach((p) => peopleSet.add(p)))
    return Array.from(peopleSet).sort()
  })

  const allLocations = computed(() => {
    const locationSet = new Set<string>()
    galleryData.value.forEach((img) =>
      getLocationPathsFromImage(img).forEach((p) => locationSet.add(p))
    )
    return Array.from(locationSet).sort()
  })

  const allTags = computed(() => {
    const tagSet = new Set<string>()
    galleryData.value.forEach((img) => img.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  })

  // Get chronological timeline (year-month pairs)
  const timeline = computed(() => {
    const timelineMap = new Map<string, number>()

    galleryData.value.forEach((img) => {
      if (img.creationDate) {
        const date = new Date(img.creationDate)
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        timelineMap.set(yearMonth, (timelineMap.get(yearMonth) || 0) + 1)
      }
    })

    return Array.from(timelineMap.entries())
      .map(([yearMonth, count]) => ({ yearMonth, count }))
      .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)) // Newest first
  })

  const availableYears = computed(() => {
    const years = new Set<number>()
    galleryData.value.forEach((img) => {
      if (!img.creationDate) return
      const y = new Date(img.creationDate).getFullYear()
      if (Number.isFinite(y)) years.add(y)
    })
    return Array.from(years).sort((a, b) => b - a)
  })

  const selectedYear = ref<number | null>(null)

  // ==================== Filtering Logic ====================

  const hasActiveFilters = computed(() => {
    return (
      selectedFilters.value.people.length > 0 ||
      selectedFilters.value.location.length > 0 ||
      selectedFilters.value.tags.length > 0
    )
  })

  function imageMatchesFilters(image: GalleryImage): boolean {
    if (!hasActiveFilters.value && selectedYear.value === null) return true

    const matchesPeople =
      selectedFilters.value.people.length === 0 ||
      selectedFilters.value.people.some((p) => image.people.includes(p))

    const imageLocationPaths = getLocationPathsFromImage(image)
    const matchesLocation =
      selectedFilters.value.location.length === 0 ||
      selectedFilters.value.location.some((l) => imageLocationPaths.includes(l))

    const matchesTags =
      selectedFilters.value.tags.length === 0 ||
      selectedFilters.value.tags.some((t) => image.tags.includes(t))

    const matchesYear =
      selectedYear.value === null ||
      (() => {
        if (!image.creationDate) return false
        const year = new Date(image.creationDate).getFullYear()
        return year === selectedYear.value
      })()

    return matchesPeople && matchesLocation && matchesTags && matchesYear
  }

  const filteredImages = computed(() => {
    return galleryData.value.filter(imageMatchesFilters).sort((a, b) => {
      // Sort by creation date descending (newest first)
      const dateA = a.creationDate ? new Date(a.creationDate).getTime() : 0
      const dateB = b.creationDate ? new Date(b.creationDate).getTime() : 0
      return dateB - dateA
    })
  })

  const filteredAlbums = computed(() => {
    if (!hasActiveFilters.value) return albums.value

    const albumsWithImages = new Set<string>()
    filteredImages.value.forEach((img) => albumsWithImages.add(img.albumName))
    return Array.from(albumsWithImages).sort()
  })

  // ==================== Image Resolution ====================

  /**
   * Resolve an image path to a URL, optionally with vite-imagetools transformations
   */
  async function resolveImage(relativePath: string): Promise<string> {
    const normalized = relativePath.toLowerCase().replace(/\\/g, '/')
    const fullPath = imagePathMap.get(normalized)

    if (!fullPath) {
      return ''
    }

    try {
      // Get the module loader function
      const moduleLoader = imageModules[fullPath]
      if (!moduleLoader) {
        return ''
      }

      // Load the module and extract the default export (the image URL)
      const module = await moduleLoader()
      const imageUrl = module.default || (module as unknown as string) || ''
      return imageUrl
    } catch {
      return ''
    }
  }

  /**
   * Resolve image synchronously (eager load, no transformations)
   */
  function resolveImageSync(relativePath: string): string {
    const normalized = relativePath.toLowerCase().replace(/\\/g, '/')
    const fullPath = imagePathMap.get(normalized)

    if (!fullPath) {
      console.warn(`Image not found: ${relativePath}`)
      return ''
    }

    // For eager loading, we'd need to use eager: true in the glob
    // For now, return a placeholder or the path itself
    return fullPath
  }

  // ==================== Filter Actions ====================

  function togglePeopleFilter(person: string) {
    const index = selectedFilters.value.people.indexOf(person)
    if (index > -1) {
      selectedFilters.value.people.splice(index, 1)
    } else {
      selectedFilters.value.people.push(person)
    }
  }

  function toggleLocationFilter(location: string) {
    const index = selectedFilters.value.location.indexOf(location)
    if (index > -1) {
      selectedFilters.value.location.splice(index, 1)
    } else {
      selectedFilters.value.location.push(location)
    }
  }

  function toggleTagFilter(tag: string) {
    const index = selectedFilters.value.tags.indexOf(tag)
    if (index > -1) {
      selectedFilters.value.tags.splice(index, 1)
    } else {
      selectedFilters.value.tags.push(tag)
    }
  }

  function clearFilters() {
    selectedFilters.value.people = []
    selectedFilters.value.location = []
    selectedFilters.value.tags = []
    selectedYear.value = null
  }

  function setYear(year: number | null) {
    selectedYear.value = year
  }

  // ==================== Mode & Selection ====================

  function setMode(newMode: GalleryMode) {
    mode.value = newMode
  }

  function selectImage(imageId: number | null) {
    selectedImageId.value = imageId
  }

  function openLightbox(imageId: number) {
    lightboxImageId.value = imageId
  }

  function closeLightbox() {
    lightboxImageId.value = null
  }

  function nextImage() {
    if (lightboxImageId.value === null) return
    const currentIndex = filteredImages.value.findIndex((img) => img.id === lightboxImageId.value)
    if (currentIndex >= 0 && currentIndex < filteredImages.value.length - 1) {
      const nextImg = filteredImages.value[currentIndex + 1]
      if (nextImg) {
        lightboxImageId.value = nextImg.id
      }
    }
  }

  function prevImage() {
    if (lightboxImageId.value === null) return
    const currentIndex = filteredImages.value.findIndex((img) => img.id === lightboxImageId.value)
    if (currentIndex > 0) {
      const prevImg = filteredImages.value[currentIndex - 1]
      if (prevImg) {
        lightboxImageId.value = prevImg.id
      }
    }
  }

  const lightboxImage = computed(() => {
    if (lightboxImageId.value === null) return null
    return galleryData.value.find((img) => img.id === lightboxImageId.value) || null
  })

  function getImagesForAlbum(albumName: string): GalleryImage[] {
    return galleryData.value
      .filter((img) => img.albumName === albumName)
      .filter(imageMatchesFilters)
  }

  function getImageLocationPaths(image: GalleryImage): string[] {
    return getLocationPathsFromTags(image.tags)
  }

  function getImageLocationLabels(image: GalleryImage): string[] {
    return getLocationPathsFromTags(image.tags).map(locationPathToLabel)
  }

  return {
    // Data
    galleryData,
    filteredImages,
    albums,
    filteredAlbums,
    allPeople,
    allLocations,
    allTags,
    timeline,
    availableYears,

    // State
    mode,
    selectedFilters,
    selectedImageId,
    lightboxImageId,
    lightboxImage,
    hasActiveFilters,
    selectedYear,

    // Actions
    setMode,
    selectImage,
    togglePeopleFilter,
    toggleLocationFilter,
    toggleTagFilter,
    clearFilters,
    setYear,
    openLightbox,
    closeLightbox,
    nextImage,
    prevImage,
    getImagesForAlbum,

    // Helpers
    getImageLocationPaths,
    getImageLocationLabels,

    // Image resolution
    resolveImage,
    resolveImageSync,
  }
}
