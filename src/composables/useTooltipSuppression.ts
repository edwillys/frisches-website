export function useTooltipSuppression() {
  function onTooltipAreaClick(event: Event) {
    const target = (event.target as HTMLElement | null)?.closest(
      '[data-tooltip]'
    ) as HTMLElement | null

    if (!target) return

    target.classList.add('tooltip-suppressed')
    target.addEventListener(
      'mouseleave',
      () => {
        target.classList.remove('tooltip-suppressed')
      },
      { once: true }
    )
  }

  return { onTooltipAreaClick }
}
