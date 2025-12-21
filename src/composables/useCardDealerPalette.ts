export type RgbTuple = [number, number, number]

type PaletteSource = 'main' | 'cover'

const parseRgbCsv = (raw: string): RgbTuple | null => {
  const parts = raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n))

  if (parts.length < 3) return null
  return [parts[0]!, parts[1]!, parts[2]!]
}

const parseRgbChannels = (styles: CSSStyleDeclaration, prefix: string): RgbTuple | null => {
  const r = parseInt(styles.getPropertyValue(`${prefix}-r`) || '0', 10)
  const g = parseInt(styles.getPropertyValue(`${prefix}-g`) || '0', 10)
  const b = parseInt(styles.getPropertyValue(`${prefix}-b`) || '0', 10)

  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null
  return [r, g, b]
}

export const readParticlesPaletteFromCss = (source: PaletteSource): RgbTuple | null => {
  try {
    const styles = getComputedStyle(document.documentElement)

    const varName = source === 'main' ? '--bg-main-particles' : '--bg-cover-particles'
    const parsedCsv = parseRgbCsv(styles.getPropertyValue(varName) || '')
    if (parsedCsv) return parsedCsv

    // Fallback to legacy per-channel variables
    return parseRgbChannels(styles, '--bg-cover-particles')
  } catch {
    return null
  }
}
