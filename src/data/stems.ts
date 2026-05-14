import stemMetadata from '@/assets/metadata/stems/metadata.json'
import type { AudioStemName } from '@/stores/audio'

export type StemAvailability = Record<AudioStemName, boolean>

export type StemForceMode = boolean | 'auto'
type StemManifestForceValue = StemForceMode | string

export interface StemManifestEntry {
  path?: string
  force?: StemManifestForceValue
  label?: string
  shortLabel?: string
  role?: string
  type?: string
}

export interface StemGroupItem {
  label?: string
  shortLabel?: string
  role?: string
  type?: string
  path?: string
  isAvailable: boolean
}

type StemManifestValue = string | StemManifestEntry | StemManifestEntry[]
export type StemTrackEntry = Partial<Record<AudioStemName, StemManifestValue>>

export interface StemAlbumManifest {
  stemRoot?: string
  songs?: Record<string, StemTrackEntry>
}

interface StemManifest {
  stems?: Record<string, StemAlbumManifest>
}

export const STEM_NAMES = [
  'drums',
  'guitar',
  'bass',
  'vocals',
  'flute',
  'brass',
  'percussion',
  'keyboard',
  'strings',
] as const satisfies readonly AudioStemName[]

const ASSETS_AUDIO_ROOT = '/src/assets/private/audio/'
export const stemAssetLoaders = import.meta.glob(
  '/src/assets/private/audio/**/*.{mp3,wav,ogg,flac,m4a,aac}'
)
const stemAssetPaths = new Set(Object.keys(stemAssetLoaders))
const manifest = stemMetadata as StemManifest

export function createStemAvailability(value: boolean): StemAvailability {
  return {
    drums: value,
    guitar: value,
    bass: value,
    vocals: value,
    flute: value,
    brass: value,
    percussion: value,
    keyboard: value,
    strings: value,
  }
}

function normalizeRelativeStemPath(relativePath: string) {
  return relativePath.replace(/\\/g, '/').trim().replace(/^\.\//, '')
}

function buildStemAssetPath(stemRoot: string | undefined, relativePath: string | undefined) {
  if (!relativePath) return undefined

  const normalizedStemRoot = stemRoot ? normalizeRelativeStemPath(stemRoot).replace(/\/+$/, '') : ''
  const normalizedPath = normalizeRelativeStemPath(relativePath)
  if (!normalizedPath) return false

  return normalizedStemRoot ? `${normalizedStemRoot}/${normalizedPath}` : normalizedPath
}

function hasValidStemFile(stemRoot: string | undefined, relativePath: string | undefined) {
  const assetPath = buildStemAssetPath(stemRoot, relativePath)
  if (!assetPath) return false

  return stemAssetPaths.has(`${ASSETS_AUDIO_ROOT}${assetPath}`)
}

function normalizeManifestEntry(entry: StemManifestValue | undefined): StemManifestEntry {
  if (!entry || Array.isArray(entry)) return {}
  return typeof entry === 'string' ? { path: entry } : entry
}

function normalizeStemForceMode(
  force: StemManifestForceValue | undefined
): StemForceMode | undefined {
  if (force === true || force === false || force === 'auto') return force
  if (typeof force !== 'string') return undefined

  const normalizedForce = force.trim().toLowerCase()
  if (normalizedForce === 'true') return true
  if (normalizedForce === 'false') return false

  return undefined
}

export function resolveStemEntryAvailability(
  entry: StemManifestValue | undefined,
  stemRoot?: string
): boolean {
  if (Array.isArray(entry)) {
    return entry.some((e) => resolveStemEntryAvailability(e, stemRoot))
  }
  const normalizedEntry = normalizeManifestEntry(entry)
  const force = normalizeStemForceMode(normalizedEntry.force)

  if (force === true) return true
  if (force === false) return false

  return hasValidStemFile(stemRoot, normalizedEntry.path)
}

export function resolveStemAvailabilityForTrackEntry(
  trackEntry?: StemTrackEntry,
  stemRoot?: string
): StemAvailability {
  if (!trackEntry) return createStemAvailability(false)

  return STEM_NAMES.reduce((availability, stem) => {
    availability[stem] = resolveStemEntryAvailability(trackEntry[stem], stemRoot)
    return availability
  }, createStemAvailability(false))
}

function splitTrackId(trackId: string) {
  const separatorIndex = trackId.indexOf(':')
  if (separatorIndex <= 0 || separatorIndex === trackId.length - 1) return null

  return {
    albumId: trackId.slice(0, separatorIndex),
    songId: trackId.slice(separatorIndex + 1),
  }
}

export function resolveStemAvailability(trackId: string | null | undefined): StemAvailability {
  if (!trackId) return createStemAvailability(false)

  const trackAddress = splitTrackId(trackId)
  if (!trackAddress) return createStemAvailability(false)

  const albumEntry = manifest.stems?.[trackAddress.albumId]
  const trackEntry = albumEntry?.songs?.[trackAddress.songId]

  return resolveStemAvailabilityForTrackEntry(trackEntry, albumEntry?.stemRoot)
}

export function resolveStemGroupItems(
  trackId: string | null | undefined
): Partial<Record<AudioStemName, StemGroupItem[]>> {
  if (!trackId) return {}

  const trackAddress = splitTrackId(trackId)
  if (!trackAddress) return {}

  const albumEntry = manifest.stems?.[trackAddress.albumId]
  const trackEntry = albumEntry?.songs?.[trackAddress.songId]
  if (!trackEntry) return {}

  const result: Partial<Record<AudioStemName, StemGroupItem[]>> = {}

  for (const stemName of STEM_NAMES) {
    const value = trackEntry[stemName]
    if (!Array.isArray(value)) continue

    result[stemName] = value.map((entry) => ({
      label: entry.label,
      shortLabel: entry.shortLabel,
      role: entry.role,
      type: entry.type,
      path: buildStemAssetPath(albumEntry?.stemRoot, entry.path) || undefined,
      isAvailable: resolveStemEntryAvailability(entry, albumEntry?.stemRoot),
    }))
  }

  return result
}

export function resolveStemAudioSources(
  trackId: string | null | undefined
): Partial<Record<AudioStemName, string[]>> {
  if (!trackId) return {}

  const trackAddress = splitTrackId(trackId)
  if (!trackAddress) return {}

  const albumEntry = manifest.stems?.[trackAddress.albumId]
  const trackEntry = albumEntry?.songs?.[trackAddress.songId]
  if (!trackEntry) return {}

  const result: Partial<Record<AudioStemName, string[]>> = {}

  for (const stemName of STEM_NAMES) {
    const value = trackEntry[stemName]
    if (!value) continue

    const entries: StemManifestEntry[] = Array.isArray(value)
      ? value
      : [normalizeManifestEntry(value)]

    const paths: string[] = []

    for (const entry of entries) {
      const assetPath = buildStemAssetPath(albumEntry?.stemRoot, entry.path)
      if (!assetPath) continue
      const fullPath = `${ASSETS_AUDIO_ROOT}${assetPath}`
      if (stemAssetPaths.has(fullPath)) {
        paths.push(fullPath)
      }
    }

    if (paths.length > 0) {
      result[stemName] = paths
    }
  }

  return result
}
