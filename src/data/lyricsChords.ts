import type {
  Line,
  LyricsChordDefinition,
  LyricsChordMetadata,
  LyricsChordPlacement,
  LyricsData,
  ResolvedLyricsChord,
  ResolvedLyricsData,
} from '@/types/lyrics'

const CHORD_TOKEN_PATTERN = /^[A-G](?:#|b)?(?:[A-Za-z0-9+()/#-]*)?$/

type ChordToken = {
  name: string
  column: number
}

function trimChordName(value: string): string {
  return value.trim()
}

function isSectionLine(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.startsWith('[') && trimmed.endsWith(']')
}

function looksLikeChordLine(value: string): boolean {
  const tokens = value.trim().split(/\s+/).filter(Boolean)
  return tokens.length > 0 && tokens.every((token) => CHORD_TOKEN_PATTERN.test(token))
}

function getTokensWithColumns(value: string): ChordToken[] {
  return [...value.matchAll(/\S+/g)].map((match) => ({
    name: trimChordName(match[0]),
    column: match.index ?? 0,
  }))
}

function getWordColumns(value: string): number[] {
  return [...value.matchAll(/\S+/g)].map((match) => match.index ?? 0)
}

function resolveWordIndex(wordColumns: number[], chordColumn: number): number | null {
  if (wordColumns.length === 0) return null

  let bestIndex = 0
  for (let index = 0; index < wordColumns.length; index += 1) {
    if (wordColumns[index] > chordColumn) break
    bestIndex = index
  }
  return bestIndex
}

function resolveStartTime(line: Line, wordIndex: number | null): number {
  if (wordIndex == null) return line.startTime
  return line.words[wordIndex]?.startTime ?? line.startTime
}

function resolvePlacementWordIndex(line: Line, placement: LyricsChordPlacement): number | null {
  if (typeof placement.columnIndex === 'number') {
    return line.words[placement.columnIndex] ? placement.columnIndex : null
  }
  if (typeof placement.wordIndex === 'number') {
    return line.words[placement.wordIndex] ? placement.wordIndex : null
  }
  return null
}

function resolveFallbackEndTime(line: Line, wordIndex: number | null): number {
  if (wordIndex == null) return line.endTime
  return Math.max(line.words[wordIndex]?.endTime ?? line.endTime, line.startTime)
}

function withResolvedEndTimes(
  line: Line,
  placements: LyricsChordPlacement[]
): LyricsChordPlacement[] {
  const sorted = [...placements].sort((left, right) => left.startTime - right.startTime)

  return sorted.map((placement, index) => {
    const resolvedWordIndex = resolvePlacementWordIndex(line, placement)
    const fallbackEndTime = resolveFallbackEndTime(line, resolvedWordIndex)
    const nextStartTime = sorted[index + 1]?.startTime ?? line.endTime
    const endTime = nextStartTime > placement.startTime ? nextStartTime : fallbackEndTime

    return {
      ...placement,
      endTime: Math.max(endTime, placement.startTime),
    }
  })
}

function parseChordSourceForLines(
  lines: Line[],
  metadata: LyricsChordMetadata | undefined
): Map<string, LyricsChordPlacement[]> {
  const source = metadata?.source?.replace(/\r/g, '')
  if (!source) return new Map()

  const parsedByLine = new Map<string, LyricsChordPlacement[]>()
  const sourceLines = source.split('\n')
  let lyricCursor = 0

  for (let index = 0; index < sourceLines.length && lyricCursor < lines.length; index += 1) {
    const currentLine = sourceLines[index] ?? ''
    if (!currentLine.trim() || isSectionLine(currentLine)) continue

    if (!looksLikeChordLine(currentLine)) {
      lyricCursor += 1
      continue
    }

    let lyricSourceIndex = index + 1
    while (lyricSourceIndex < sourceLines.length && !sourceLines[lyricSourceIndex]?.trim()) {
      lyricSourceIndex += 1
    }

    const lyricSourceLine = sourceLines[lyricSourceIndex] ?? ''
    if (
      !lyricSourceLine.trim() ||
      isSectionLine(lyricSourceLine) ||
      looksLikeChordLine(lyricSourceLine)
    ) {
      continue
    }

    const line = lines[lyricCursor]
    if (!line) break

    if (!line.chords?.length) {
      const chordTokens = getTokensWithColumns(currentLine)
      const wordColumns = getWordColumns(lyricSourceLine)
      const placements = chordTokens.map((token, tokenIndex) => {
        const wordIndex = resolveWordIndex(wordColumns, token.column)
        return {
          id: `${line.id}-chord-${tokenIndex}`,
          name: token.name,
          startTime: resolveStartTime(line, wordIndex),
          endTime: line.endTime,
          rowIndex: 0,
          columnIndex: wordIndex,
          wordIndex,
        }
      })

      parsedByLine.set(line.id, withResolvedEndTimes(line, placements))
    }

    lyricCursor += 1
    index = lyricSourceIndex
  }

  return parsedByLine
}

function resolveDefinitionsByName(
  metadata: LyricsChordMetadata | undefined,
  lines: Line[]
): Record<string, LyricsChordDefinition> {
  const definitionsByName = Object.fromEntries(
    Object.entries(metadata?.definitions ?? {}).map(([key, definition]) => {
      const definitionKey = trimChordName(key)
      const displayName = trimChordName(definition.name || definitionKey)
      return [definitionKey, { ...definition, name: displayName }]
    })
  ) as Record<string, LyricsChordDefinition>

  for (const line of lines) {
    for (const chord of line.chords ?? []) {
      const definitionKey = trimChordName(chord.name)
      if (!definitionKey || definitionsByName[definitionKey]) continue
      definitionsByName[definitionKey] = { name: definitionKey }
    }
  }

  return definitionsByName
}

function normalizeLineChords(
  line: Line,
  placements: LyricsChordPlacement[]
): LyricsChordPlacement[] {
  const normalized = placements
    .map((placement, index) => {
      const hasRowIndex = typeof placement.rowIndex === 'number'
      const hasColumnIndex = typeof placement.columnIndex === 'number'
      const normalizedWordIndex: number | null =
        typeof placement.wordIndex === 'number'
          ? placement.wordIndex
          : hasColumnIndex
            ? (placement.columnIndex ?? null)
            : null

      return {
        ...placement,
        id: placement.id?.trim() || `${line.id}-chord-${index}`,
        name: trimChordName(placement.name),
        startTime:
          typeof placement.startTime === 'number'
            ? placement.startTime
            : resolveStartTime(line, normalizedWordIndex),
        endTime: placement.endTime,
        rowIndex: hasRowIndex ? placement.rowIndex : 0,
        columnIndex: hasColumnIndex ? placement.columnIndex : normalizedWordIndex,
        wordIndex: normalizedWordIndex,
      }
    })
    .filter((placement) => placement.name.length > 0)

  return withResolvedEndTimes(line, normalized)
}

export function normalizeLyricsData(data: LyricsData): ResolvedLyricsData {
  const parsedByLine = parseChordSourceForLines(data.lyrics, data.meta.chords)
  const normalizedLyrics = data.lyrics.map((line) => {
    const placements = line.chords?.length ? line.chords : (parsedByLine.get(line.id) ?? [])
    return {
      ...line,
      chords: normalizeLineChords(line, placements),
    }
  })

  const definitionsByName = resolveDefinitionsByName(data.meta.chords, normalizedLyrics)
  const timeline: ResolvedLyricsChord[] = normalizedLyrics.flatMap((line, lineIndex) =>
    (line.chords ?? []).map((chord) => ({
      ...chord,
      lineId: line.id,
      lineIndex,
      definition: definitionsByName[chord.name] ?? null,
    }))
  )

  const uniqueNames = Array.from(
    new Set([...timeline.map((chord) => chord.name), ...Object.keys(definitionsByName)])
  )

  return {
    ...data,
    lyrics: normalizedLyrics,
    resolvedChords: {
      enabled: Boolean(
        data.meta.chords?.enabled ?? (uniqueNames.length > 0 || timeline.length > 0)
      ),
      uniqueNames,
      definitionsByName,
      timeline,
    },
  }
}

export function getActiveChordAtTime(
  data: Pick<ResolvedLyricsData, 'resolvedChords'>,
  currentTimeMs: number
): ResolvedLyricsChord | null {
  return (
    data.resolvedChords.timeline.find(
      (chord) => currentTimeMs >= chord.startTime && currentTimeMs <= chord.endTime
    ) ?? null
  )
}
