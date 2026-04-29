export interface Word {
  text: string
  startTime: number // ms
  endTime: number // ms
  duration: number // ms (used for CSS transition-duration)
}

export type LyricsSectionType =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'bridge'
  | 'refrain'
  | 'outro'
  | 'interlude'

export interface Line {
  id: string
  startTime: number // ms
  endTime: number // ms
  text: string // full line text
  words: Word[]
  section?: LyricsSectionType
}

export interface LyricsData {
  meta: {
    title: string
    totalDurationMs: number
    version: string
    credits?: string
  }
  lyrics: Line[]
}
