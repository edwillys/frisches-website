import { computed } from 'vue'

type ThemeSource =
  | {
      themeColor?: string
      themeColorDark?: string
    }
  | null
  | undefined

function colorMixForShadow(color: string) {
  return color.startsWith('#') ? `${color}66` : color
}

export function usePlayerThemeStyle(getThemeSource: () => ThemeSource, prefix: string) {
  return computed(() => {
    const themeSource = getThemeSource()
    const themeColor = themeSource?.themeColor ?? 'var(--color-secondary)'
    const themeColorDark = themeSource?.themeColorDark ?? 'var(--color-secondary-dark)'

    return {
      [`--${prefix}-color`]: themeColor,
      [`--${prefix}-dark`]: themeColorDark,
      [`--${prefix}-shadow`]: colorMixForShadow(themeColor),
    }
  })
}
