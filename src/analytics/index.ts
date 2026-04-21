/**
 * Umami analytics – thin wrapper so callers never need to care whether
 * the Umami script has loaded or whether we are in a test/SSR environment.
 *
 * window.umami is injected by the <script> tag in index.html when
 * VITE_UMAMI_WEBSITE_ID is set.  All calls are no-ops when it is absent.
 */

type UmamiEventData = Record<string, string | number>

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: UmamiEventData) => void
    }
  }
}

export function trackEvent(event: string, data?: UmamiEventData): void {
  if (typeof window === 'undefined') return
  window.umami?.track(event, data)
}

// ─── Typed helpers ────────────────────────────────────────────────────────────

export type SocialPlatform = 'spotify' | 'instagram' | 'youtube' | 'github' | 'bandcamp' | 'tiktok'

/** User clicked a social-media / streaming link */
export function trackSocialClick(platform: SocialPlatform): void {
  trackEvent('social-click', { platform })
}

/** User switched the UI language */
export function trackLanguageChanged(from: string, to: string): void {
  trackEvent('language-changed', { from, to })
}

/** A major section became visible (intersection observer / manual call) */
export function trackSectionViewed(section: 'music' | 'about' | 'gallery'): void {
  trackEvent('section-viewed', { section })
}

/** User opened or expanded a gallery photo */
export function trackGalleryPhotoViewed(photoId: string | number): void {
  trackEvent('gallery-photo-viewed', { photoId: String(photoId) })
}

/** User toggled the lyrics panel */
export function trackLyricsToggled(open: boolean): void {
  trackEvent('lyrics-toggled', { state: open ? 'open' : 'close' })
}
