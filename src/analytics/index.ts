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
