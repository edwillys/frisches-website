import stemMetadata from '@/assets/private/audio/metadata.json'
import type { AudioStemName } from '@/stores/audio'

export type StemAvailability = Record<AudioStemName, boolean>

export type StemForceMode = boolean | 'auto'
type StemManifestForceValue = StemForceMode | string

export interface StemManifestEntry {
  path?: string
  force?: StemManifestForceValue
}

type StemManifestValue = string | StemManifestEntry
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
] as const satisfies readonly AudioStemName[]

const ASSETS_AUDIO_ROOT = '/src/assets/private/audio/'
const stemAssetModules = import.meta.glob(
  '/src/assets/private/audio/**/*.{mp3,wav,ogg,flac,m4a,aac}'
)
const stemAssetPaths = new Set(Object.keys(stemAssetModules))
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
  if (!entry) return {}
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
) {
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
