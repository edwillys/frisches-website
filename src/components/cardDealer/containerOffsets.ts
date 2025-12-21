export type Offset = {
  x: number
  y: number
}

export const getOffsetsToContainerCenter = (
  cards: HTMLElement[],
  container: HTMLElement
): Offset[] => {
  const containerRect = container.getBoundingClientRect()
  const centerX = containerRect.width / 2
  const centerY = containerRect.height / 2

  return cards.map((card) => {
    const rect = card.getBoundingClientRect()
    const cardCenterX = rect.left - containerRect.left + rect.width / 2
    const cardCenterY = rect.top - containerRect.top + rect.height / 2

    return {
      x: centerX - cardCenterX,
      y: centerY - cardCenterY,
    }
  })
}
