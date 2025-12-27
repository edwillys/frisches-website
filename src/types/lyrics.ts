export interface Word {
  text: string
  startTime: number // ms
  endTime: number // ms
  duration: number // ms (used for CSS transition-duration)
}

export interface Line {
  id: string
  startTime: number // ms
  endTime: number // ms
  text: string // full line text
  words: Word[]
}

export interface LyricsData {
  meta: {
    title: string
    totalDurationMs: number
    version: string
  }
  lyrics: Line[]
}
