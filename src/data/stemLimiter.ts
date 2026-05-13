export interface LimiterParams {
  preGainDb: number
  threshold: number
  knee: number
  ratio: number
  attack: number
  release: number
}

export const DEFAULT_LIMITER_PARAMS: LimiterParams = {
  preGainDb: 0,
  threshold: -0.1,
  knee: 0,
  ratio: 20,
  attack: 0.003,
  release: 0.1,
}

interface StemLimiterMetadataFile {
  limiter_settings?: {
    python_pedalboard?: {
      input_drive_db?: number
      ceiling_db?: number
      release_ms?: number
    }
  }
}

const limiterMetadataModules = import.meta.glob('/src/assets/metadata/limiter/**/*.json', {
  eager: true,
}) as Record<string, { default: StemLimiterMetadataFile } | StemLimiterMetadataFile>

function trackIdFromMetadataPath(filePath: string) {
  const match = filePath.match(/\/src\/assets\/metadata\/limiter\/([^/]+)\/([^/]+)\.json$/)
  if (!match) return null
  return `${match[1]}:${match[2]}`
}

const limiterMetadataByTrackId = new Map<string, StemLimiterMetadataFile>()

for (const [filePath, mod] of Object.entries(limiterMetadataModules)) {
  const trackId = trackIdFromMetadataPath(filePath)
  if (!trackId) continue
  limiterMetadataByTrackId.set(trackId, 'default' in mod ? mod.default : mod)
}

export function resolveStemLimiterParams(trackId: string | null | undefined): LimiterParams | null {
  if (!trackId) return null

  const metadata = limiterMetadataByTrackId.get(trackId)
  const pedalboardSettings = metadata?.limiter_settings?.python_pedalboard

  if (pedalboardSettings) {
    return {
      preGainDb: pedalboardSettings.input_drive_db ?? 0,
      threshold: pedalboardSettings.ceiling_db ?? -0.1,
      knee: 0,
      ratio: 20,
      attack: 0.003,
      release: (pedalboardSettings.release_ms ?? 100) / 1000,
    }
  }

  return null
}
