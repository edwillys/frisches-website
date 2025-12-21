export type LeadStaggerConfig = {
  startBase: number
  startStep: number
  durationBase: number
  durationStep: number
}

export const distanceFromLead = (index: number, leadIndex: number): number =>
  Math.abs(index - leadIndex)

export const computeLeadStagger = (
  index: number,
  leadIndex: number,
  config: LeadStaggerConfig
): { at: number; duration: number } => {
  const distance = distanceFromLead(index, leadIndex)
  return {
    at: config.startBase + distance * config.startStep,
    duration: config.durationBase + distance * config.durationStep,
  }
}
