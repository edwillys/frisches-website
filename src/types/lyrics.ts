export interface Word {
  text: string
  startTime: number // ms
  endTime: number // ms
  duration: number // ms (used for CSS transition-duration)
}

export type LyricsChordDiagramFret = number | 'x'

export interface LyricsChordBarre {
  fret: number
  fromString: number
  toString: number
  finger?: number | null
}

export interface LyricsChordDiagram {
  frets: LyricsChordDiagramFret[]
  fingers?: Array<number | null>
  baseFret?: number
  barreFrets?: number[]
  barres?: LyricsChordBarre[]
  tuning?: string[]
}

export interface LyricsChordDefinition {
  name: string
  displayName?: string
  diagram?: LyricsChordDiagram
}

export interface LyricsChordPlacement {
  id: string
  name: string
  startTime: number // ms
  endTime: number // ms
  rowIndex?: number | null
  columnIndex?: number | null
  // Deprecated, kept for backward compatibility with existing lyric JSON files.
  wordIndex?: number | null
}

export interface InstrumentalLayout {
  mode?: 'textNone' | 'textOnce' | 'textOncePerRow' | 'textOncePerColumn'
  rows: number
  columns: number
}

export interface LyricsChordMetadata {
  enabled?: boolean
  source?: string
  definitions?: Record<string, LyricsChordDefinition>
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
  instrumental?: InstrumentalLayout
  chords?: LyricsChordPlacement[]
}

export interface LyricsData {
  meta: {
    title: string
    totalDurationMs: number
    version: string
    credits?: string
    chords?: LyricsChordMetadata
  }
  lyrics: Line[]
}

export interface ResolvedLyricsChord extends LyricsChordPlacement {
  lineId: string
  lineIndex: number
  definition: LyricsChordDefinition | null
}

export interface ResolvedLyricsChords {
  enabled: boolean
  uniqueNames: string[]
  definitionsByName: Record<string, LyricsChordDefinition>
  timeline: ResolvedLyricsChord[]
}

export interface ResolvedLyricsData extends LyricsData {
  resolvedChords: ResolvedLyricsChords
}
