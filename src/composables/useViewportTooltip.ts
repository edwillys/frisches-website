import { onMounted, onUnmounted } from 'vue'

/**
 * Half-width of the CSS border triangle.
 * Must equal the `border` value in the `.vp-tooltip-arrow` CSS rule (currently 8px).
 */
const ARROW_SIZE = 8
/** Minimum distance from any viewport edge. */
const MARGIN = 8
/**
 * Minimum inset from the tooltip's rounded corners for the arrow tip.
 * Should stay below the tooltip's border-radius (currently 8px in tooltip.css).
 */
const MIN_ARROW_INSET = 6

interface PositionedTooltip {
  left: number
  above: boolean
  tooltipRect: DOMRect
  targetRect: DOMRect
}

interface YoutubePreviewData {
  title: string
  metaPrimary?: string
  metaSecondary?: string
  thumbnailUrl?: string
}

interface YoutubeOEmbedResponse {
  title?: string
  thumbnail_url?: string
}

const youtubePreviewCache = new Map<string, Promise<YoutubePreviewData>>()

const YOUTUBE_THUMBNAIL_FALLBACK = (ytId: string) =>
  `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`

const fetchYoutubePreviewFromOEmbed = async (ytId: string): Promise<YoutubePreviewData> => {
  const url = new URL('https://noembed.com/embed')
  url.searchParams.set('url', `https://www.youtube.com/watch?v=${ytId}`)

  const response = await fetch(url)
  if (!response.ok) {
    return { title: '', thumbnailUrl: YOUTUBE_THUMBNAIL_FALLBACK(ytId) }
  }

  const payload = (await response.json()) as YoutubeOEmbedResponse

  return {
    title: payload.title ?? '',
    thumbnailUrl: payload.thumbnail_url ?? YOUTUBE_THUMBNAIL_FALLBACK(ytId),
  }
}

const getYoutubePreview = (ytId: string) => {
  const cached = youtubePreviewCache.get(ytId)
  if (cached) return cached

  const request = fetchYoutubePreviewFromOEmbed(ytId).catch((err: unknown) => {
    // Evict on failure so the next hover retries instead of replaying the rejected promise.
    youtubePreviewCache.delete(ytId)
    return Promise.reject(err) as Promise<YoutubePreviewData>
  })

  youtubePreviewCache.set(ytId, request)
  return request
}

export function useViewportTooltip() {
  let tip: HTMLDivElement | null = null
  let arrow: HTMLDivElement | null = null
  let activeTarget: HTMLElement | null = null
  let tipCard: HTMLDivElement | null = null
  let tipCardImg: HTMLImageElement | null = null
  let tipCardTitle: HTMLDivElement | null = null
  let tipCardMeta: HTMLDivElement | null = null
  let tipCardMetaPrimary: HTMLSpanElement | null = null
  let tipCardMetaSecondary: HTMLSpanElement | null = null

  function ensureElements() {
    if (!tip) {
      tip = document.createElement('div')
      tip.className = 'vp-tooltip'
      tip.setAttribute('aria-hidden', 'true')
      tip.style.display = 'none'
      document.body.appendChild(tip)
    }
    if (!arrow) {
      arrow = document.createElement('div')
      arrow.className = 'vp-tooltip-arrow'
      arrow.style.display = 'none'
      document.body.appendChild(arrow)
    }
  }

  function hide() {
    if (tip) tip.style.display = 'none'
    if (arrow) arrow.style.display = 'none'
    if (tipCard) tipCard.style.display = 'none'
    activeTarget = null
  }

  function ensureCardElement() {
    if (tipCard) return
    tipCard = document.createElement('div')
    tipCard.className = 'vp-tooltip vp-tooltip--yt-card'
    tipCard.setAttribute('aria-hidden', 'true')
    tipCard.style.display = 'none'

    tipCardImg = document.createElement('img')
    tipCardImg.className = 'vp-tooltip__yt-thumb'
    tipCardImg.alt = ''
    tipCard.appendChild(tipCardImg)

    const copy = document.createElement('div')
    copy.className = 'vp-tooltip__yt-copy'

    tipCardTitle = document.createElement('div')
    tipCardTitle.className = 'vp-tooltip__yt-title'
    copy.appendChild(tipCardTitle)

    tipCardMeta = document.createElement('div')
    tipCardMeta.className = 'vp-tooltip__yt-meta'

    tipCardMetaPrimary = document.createElement('span')
    tipCardMetaPrimary.className = 'vp-tooltip__yt-meta-item'
    tipCardMeta.appendChild(tipCardMetaPrimary)

    tipCardMetaSecondary = document.createElement('span')
    tipCardMetaSecondary.className = 'vp-tooltip__yt-meta-item'
    tipCardMeta.appendChild(tipCardMetaSecondary)

    copy.appendChild(tipCardMeta)
    tipCard.appendChild(copy)

    document.body.appendChild(tipCard)
  }

  function positionElement(el: HTMLElement, target: HTMLElement): PositionedTooltip {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const tooltipRect = el.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
    left = Math.max(MARGIN, Math.min(left, vw - tooltipRect.width - MARGIN))

    const tipH = tooltipRect.height
    const above = targetRect.top - ARROW_SIZE - tipH - MARGIN >= 0
    const belowFits = targetRect.bottom + ARROW_SIZE + tipH + MARGIN <= vh
    const top = above
      ? targetRect.top - ARROW_SIZE - tipH
      : belowFits
        ? targetRect.bottom + ARROW_SIZE
        : vh - tipH - MARGIN

    el.style.left = `${left}px`
    el.style.top = `${top}px`

    return { left, above, tooltipRect, targetRect }
  }

  function showTextTooltip(target: HTMLElement) {
    const text = target.dataset.tooltip
    if (!text) return
    if (target.classList.contains('tooltip-suppressed')) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    ensureElements()

    if (tipCard) {
      tipCard.style.display = 'none'
    }

    tip!.textContent = text

    tip!.style.visibility = 'hidden'
    tip!.style.display = 'block'
    tip!.style.top = '0'
    tip!.style.left = '0'

    tip!.style.animation = 'none'
    arrow!.style.animation = 'none'
    void tip!.offsetHeight
    tip!.style.animation = ''
    arrow!.style.animation = ''

    const { left, above, tooltipRect, targetRect } = positionElement(tip!, target)
    tip!.style.visibility = 'visible'

    const bg = getComputedStyle(tip!).backgroundColor
    const arrowW = ARROW_SIZE * 2
    const idealArrowLeft = targetRect.left + targetRect.width / 2 - ARROW_SIZE
    const arrowLeft = Math.max(
      left + MIN_ARROW_INSET,
      Math.min(idealArrowLeft, left + tooltipRect.width - MIN_ARROW_INSET - arrowW)
    )

    arrow!.style.display = 'block'
    arrow!.style.left = `${arrowLeft}px`
    arrow!.style.top = above ? `${targetRect.top - ARROW_SIZE}px` : `${targetRect.bottom}px`
    arrow!.style.borderTopColor = above ? bg : 'transparent'
    arrow!.style.borderBottomColor = above ? 'transparent' : bg
    arrow!.style.borderLeftColor = 'transparent'
    arrow!.style.borderRightColor = 'transparent'
    arrow!.style.visibility = 'visible'
  }

  function showYoutubeCard(target: HTMLElement) {
    const ytId = target.dataset.tooltipYt
    if (!ytId) return
    if (target.classList.contains('tooltip-suppressed')) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    ensureCardElement()

    if (tip) {
      tip.style.display = 'none'
    }
    if (arrow) {
      arrow.style.display = 'none'
    }

    tipCardImg!.src = YOUTUBE_THUMBNAIL_FALLBACK(ytId)
    tipCardTitle!.textContent = target.dataset.tooltipCardTitle ?? ''

    const metaPrimary = target.dataset.tooltipCardMetaPrimary ?? ''
    const metaSecondary = target.dataset.tooltipCardMetaSecondary ?? ''
    tipCardMetaPrimary!.textContent = metaPrimary
    tipCardMetaSecondary!.textContent = metaSecondary
    tipCardMetaPrimary!.style.display = metaPrimary ? '' : 'none'
    tipCardMetaSecondary!.style.display = metaSecondary ? '' : 'none'
    tipCardMeta!.style.display = metaPrimary || metaSecondary ? 'flex' : 'none'

    tipCard!.style.visibility = 'hidden'
    tipCard!.style.display = 'block'
    tipCard!.style.top = '0'
    tipCard!.style.left = '0'

    tipCard!.style.animation = 'none'
    void tipCard!.offsetHeight
    tipCard!.style.animation = ''

    positionElement(tipCard!, target) // no arrow for the card; return value intentionally unused
    tipCard!.style.visibility = 'visible'

    void getYoutubePreview(ytId)
      .then((preview) => {
        if (activeTarget !== target || !tipCard) return

        // Hide first so the browser measures the new height before we reposition.
        tipCard.style.visibility = 'hidden'
        tipCardTitle!.textContent = preview.title
        tipCardImg!.src = preview.thumbnailUrl ?? YOUTUBE_THUMBNAIL_FALLBACK(ytId)
        positionElement(tipCard, target)
        tipCard.style.visibility = 'visible'
      })
      .catch(() => undefined)
  }

  function show(target: HTMLElement) {
    if (target.dataset.tooltipYt) {
      showYoutubeCard(target)
      return
    }

    showTextTooltip(target)
  }

  function findTarget(node: EventTarget | null): HTMLElement | null {
    if (!node) return null

    const element =
      node instanceof HTMLElement || node instanceof SVGElement
        ? node
        : node instanceof Node
          ? node.parentElement
          : null

    return element?.closest(
      '[data-tooltip]:not([data-tooltip=""]), [data-tooltip-yt]:not([data-tooltip-yt=""])'
    ) as HTMLElement | null
  }

  function onPointerOver(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return
    const target = findTarget(e.target)
    if (!target) {
      if (activeTarget) hide()
      return
    }
    if (target === activeTarget) return
    activeTarget = target
    show(target)
  }

  function onPointerOut(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return
    const target = findTarget(e.target)
    if (!target || target !== activeTarget) return
    // Still inside the element (moving between child nodes) — keep showing
    if (e.relatedTarget && (target as HTMLElement).contains(e.relatedTarget as Node)) return
    hide()
  }

  // Hide on scroll or click (scroll changes element position; click triggers suppression)
  function onScroll() {
    hide()
  }
  function onClick() {
    hide()
  }

  onMounted(() => {
    document.addEventListener('pointerover', onPointerOver, { passive: true })
    document.addEventListener('pointerout', onPointerOut, { passive: true })
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    document.addEventListener('click', onClick, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('pointerover', onPointerOver)
    document.removeEventListener('pointerout', onPointerOut)
    document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions)
    document.removeEventListener('click', onClick)
    tip?.remove()
    arrow?.remove()
    tipCard?.remove()
    tip = null
    arrow = null
    tipCard = null
    tipCardImg = null
    tipCardTitle = null
    tipCardMeta = null
    tipCardMetaPrimary = null
    tipCardMetaSecondary = null
  })
}
