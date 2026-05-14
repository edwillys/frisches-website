const AUDIO_RESOURCE_RE = /\.(mp3|wav|ogg|aac|m4a|flac)(\?|$)/i

export type AudioResourceTimingLike = {
  name: string
  transferSize?: number
  encodedBodySize?: number
  decodedBodySize?: number
  duration?: number
}

export type MasterResourceDebug = {
  src: string
  transferBytes: number
  encodedBodyBytes: number
  decodedBodyBytes: number
  durationMs: number
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function normalizeResourceKey(input: string): string {
  try {
    const normalized = new URL(input, 'http://localhost')
    return decodeURIComponent(`${normalized.origin}${normalized.pathname}${normalized.search}`)
  } catch {
    return decodeURIComponent(input)
  }
}

function isAudioResourceName(name: string): boolean {
  return !name.startsWith('blob:') && AUDIO_RESOURCE_RE.test(name)
}

export function findLatestAudioResourceEntry(
  resourceEntries: AudioResourceTimingLike[],
  src: string
): AudioResourceTimingLike | null {
  const targetKey = normalizeResourceKey(src)

  for (let index = resourceEntries.length - 1; index >= 0; index -= 1) {
    const entry = resourceEntries[index]
    if (!entry || !isAudioResourceName(entry.name)) continue
    if (normalizeResourceKey(entry.name) === targetKey) {
      return entry
    }
  }

  return null
}

export function buildCurrentMasterResourceDebug(options: {
  src: string
  resourceEntries: AudioResourceTimingLike[]
  contentLengthBytes?: number | null
  bufferedRatio?: number
}): MasterResourceDebug | null {
  const { src, resourceEntries, contentLengthBytes, bufferedRatio = 0 } = options
  if (!src) return null

  const entry = findLatestAudioResourceEntry(resourceEntries, src)
  const measuredTransferBytes = Math.max(entry?.transferSize ?? 0, entry?.encodedBodySize ?? 0)
  const bufferedTransferEstimate =
    contentLengthBytes && contentLengthBytes > 0
      ? Math.round(contentLengthBytes * clamp01(bufferedRatio))
      : 0
  const transferBytes = Math.max(measuredTransferBytes, bufferedTransferEstimate)
  const encodedBodyBytes = Math.max(entry?.encodedBodySize ?? 0, contentLengthBytes ?? 0)

  if (!entry && encodedBodyBytes <= 0 && transferBytes <= 0) {
    return null
  }

  return {
    src,
    transferBytes,
    encodedBodyBytes,
    decodedBodyBytes: entry?.decodedBodySize ?? 0,
    durationMs: Math.round(entry?.duration ?? 0),
  }
}

export function getMasterSessionTransferredBytes(options: {
  resourceEntries: AudioResourceTimingLike[]
  observedBytesBySrc: ReadonlyMap<string, number>
}): number {
  const { resourceEntries, observedBytesBySrc } = options
  const bytesBySrc = new Map<string, number>()

  for (const entry of resourceEntries) {
    if (!entry || !isAudioResourceName(entry.name)) continue
    const key = normalizeResourceKey(entry.name)
    const measuredBytes = Math.max(entry.transferSize ?? 0, entry.encodedBodySize ?? 0)
    bytesBySrc.set(key, Math.max(bytesBySrc.get(key) ?? 0, measuredBytes))
  }

  for (const [src, observedBytes] of observedBytesBySrc) {
    const key = normalizeResourceKey(src)
    bytesBySrc.set(key, Math.max(bytesBySrc.get(key) ?? 0, observedBytes))
  }

  let total = 0
  for (const value of bytesBySrc.values()) {
    total += value
  }

  return total
}
