export const MINI_PROGRESS_WOBBLE = Object.freeze({
  shellHeightPx: 16,
  trackThicknessPx: 4,
  baseCornerRadiusPx: 2,
  waveSamples: 36,
  amplitudeMaxPx: 3.8,
  amplitudeRampStartRatio: 0.02,
  amplitudeRampFullRatio: 0.3,
  amplitudeRampCurvePower: 1.45,
  edgeEnvelopePower: 0.95,
  crestWidthNorm: 0.24,
  crestSpacingNorm: 0.24,
  crestSecondaryWeight: 0.62,
  crestSharpness: 1.1,
  waveTailExitMarginNorm: 0.12,
  travelTimeMinSec: 1.5,
  travelTimeMaxSec: 2.5,
  speedCatchupPerSec: 2.8,
  speedJitterRatio: 0.2,
  accelNoiseRatioPerSec2: 0.32,
  accelSmoothing: 0.1,
  retargetChancePerSec: 2,
  waveRestartDelaySec: 0,
  wavePrimaryStartDelaySec: 0,
  wavePrimaryStartJitterSec: 0.02,
  waveSecondaryStartDelaySec: 0.24,
  waveSecondaryStartJitterSec: 0.08,
  wavePrimaryDurationBiasSec: 0,
  waveSecondaryDurationBiasSec: 0.22,
  wavePrimaryAmplitudeMultiplier: 1,
  waveSecondaryAmplitudeMultiplier: 0.62,
})

export type MiniPlayerWobbleConfig = typeof MINI_PROGRESS_WOBBLE
export type RandomFn = () => number

export type TravelingWaveState = {
  active: boolean
  headPx: number
  ageSec: number
  durationSec: number
  speedPxPerSec: number
  targetSpeedPxPerSec: number
  accelPxPerSec2: number
  amplitudeScale: number
  crestWidthNorm: number
  crestSpacingNorm: number
  restartAtSec: number
  startDelaySec: number
  startDelayJitterSec: number
  durationBiasSec: number
  amplitudeMultiplier: number
}

export type WavePoint = {
  x: number
  y: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function randomBetween(min: number, max: number, randomFn: RandomFn = Math.random): number {
  return min + randomFn() * (max - min)
}

export function makeWave(
  options: {
    startDelaySec: number
    startDelayJitterSec?: number
    durationBiasSec: number
    amplitudeMultiplier: number
  },
  config: MiniPlayerWobbleConfig = MINI_PROGRESS_WOBBLE
): TravelingWaveState {
  return {
    active: false,
    headPx: 0,
    ageSec: 0,
    durationSec: config.travelTimeMinSec,
    speedPxPerSec: 0,
    targetSpeedPxPerSec: 0,
    accelPxPerSec2: 0,
    amplitudeScale: 1,
    crestWidthNorm: config.crestWidthNorm,
    crestSpacingNorm: config.crestSpacingNorm,
    restartAtSec: 0,
    startDelaySec: options.startDelaySec,
    startDelayJitterSec: options.startDelayJitterSec ?? 0,
    durationBiasSec: options.durationBiasSec,
    amplitudeMultiplier: options.amplitudeMultiplier,
  }
}

export function scheduleWaveRestart(
  wave: TravelingWaveState,
  nowSec: number,
  config: MiniPlayerWobbleConfig = MINI_PROGRESS_WOBBLE,
  options: {
    includeStartDelay?: boolean
    randomFn?: RandomFn
  } = {}
): void {
  const { includeStartDelay = true, randomFn = Math.random } = options
  wave.active = false
  wave.headPx = 0
  wave.ageSec = 0
  wave.accelPxPerSec2 = 0

  const restartDelay = Math.max(config.waveRestartDelaySec, 1 / 60)
  const waveDelay = includeStartDelay
    ? wave.startDelaySec + randomBetween(0, wave.startDelayJitterSec, randomFn)
    : 0

  wave.restartAtSec = nowSec + restartDelay + waveDelay
}

export function launchWave(
  wave: TravelingWaveState,
  fillWidthPx: number,
  isPlaying: boolean,
  nowSec: number,
  config: MiniPlayerWobbleConfig = MINI_PROGRESS_WOBBLE,
  randomFn: RandomFn = Math.random
): void {
  if (fillWidthPx <= 1 || !isPlaying) {
    scheduleWaveRestart(wave, nowSec, config, { includeStartDelay: false, randomFn })
    return
  }

  wave.active = true
  wave.headPx = 0
  wave.ageSec = 0
  wave.durationSec = clamp(
    randomBetween(config.travelTimeMinSec, config.travelTimeMaxSec, randomFn) +
      wave.durationBiasSec,
    config.travelTimeMinSec,
    config.travelTimeMaxSec
  )

  const baseSpeed = fillWidthPx / Math.max(0.001, wave.durationSec)
  wave.speedPxPerSec = baseSpeed
  wave.targetSpeedPxPerSec = baseSpeed
  wave.crestWidthNorm = config.crestWidthNorm * randomBetween(0.9, 1.14, randomFn)
  wave.crestSpacingNorm = config.crestSpacingNorm * randomBetween(0.9, 1.12, randomFn)
  wave.amplitudeScale = randomBetween(0.85, 1.15, randomFn)
  wave.accelPxPerSec2 = 0
}

export function updateWaveMotion(
  wave: TravelingWaveState,
  dtSec: number,
  fillWidthPx: number,
  isPlaying: boolean,
  nowSec: number,
  config: MiniPlayerWobbleConfig = MINI_PROGRESS_WOBBLE,
  randomFn: RandomFn = Math.random
): void {
  if (!isPlaying) {
    wave.active = false
    return
  }

  if (!wave.active) {
    if (nowSec >= wave.restartAtSec) {
      launchWave(wave, fillWidthPx, isPlaying, nowSec, config, randomFn)
    }
    return
  }

  wave.ageSec += dtSec

  const baseSpeed = fillWidthPx / Math.max(0.001, wave.durationSec)
  const speedMin = baseSpeed * (1 - config.speedJitterRatio)
  const speedMax = baseSpeed * (1 + config.speedJitterRatio)

  if (randomFn() < config.retargetChancePerSec * dtSec) {
    wave.targetSpeedPxPerSec = randomBetween(speedMin, speedMax, randomFn)
  }

  const remainingDist = Math.max(0, fillWidthPx - wave.headPx)
  const remainingTime = Math.max(0.06, wave.durationSec - wave.ageSec)
  const requiredSpeed = remainingDist / remainingTime
  wave.targetSpeedPxPerSec = clamp(
    0.65 * wave.targetSpeedPxPerSec + 0.35 * requiredSpeed,
    speedMin,
    speedMax
  )

  const catchupAccel = (wave.targetSpeedPxPerSec - wave.speedPxPerSec) * config.speedCatchupPerSec
  const noiseAccel = randomBetween(-1, 1, randomFn) * baseSpeed * config.accelNoiseRatioPerSec2
  const nextAccel = catchupAccel + noiseAccel

  wave.accelPxPerSec2 += (nextAccel - wave.accelPxPerSec2) * config.accelSmoothing
  wave.speedPxPerSec = clamp(wave.speedPxPerSec + wave.accelPxPerSec2 * dtSec, speedMin, speedMax)
  wave.headPx += wave.speedPxPerSec * dtSec

  const exitNorm = 1 + wave.crestWidthNorm + wave.crestSpacingNorm + config.waveTailExitMarginNorm
  const exitPx = fillWidthPx * exitNorm
  if (wave.headPx >= exitPx) {
    wave.headPx = exitPx
    scheduleWaveRestart(wave, nowSec, config, { includeStartDelay: true, randomFn })
  }
}

export function amplitudeScaleFromPlayedRatio(
  playedRatio: number,
  config: MiniPlayerWobbleConfig = MINI_PROGRESS_WOBBLE
): number {
  const start = config.amplitudeRampStartRatio
  const full = Math.max(start + 0.0001, config.amplitudeRampFullRatio)
  const normalized = clamp((playedRatio - start) / (full - start), 0, 1)
  return Math.pow(normalized, config.amplitudeRampCurvePower)
}

export function edgeEnvelope(
  positionNorm: number,
  config: MiniPlayerWobbleConfig = MINI_PROGRESS_WOBBLE
): number {
  const u = clamp(positionNorm, 0, 1)
  const edge = Math.sin(Math.PI * u)
  return Math.pow(Math.max(0, edge), config.edgeEnvelopePower)
}

export function singleCrestPulse(
  positionNorm: number,
  centerNorm: number,
  widthNorm: number,
  config: MiniPlayerWobbleConfig = MINI_PROGRESS_WOBBLE
): number {
  const width = Math.max(0.01, widthNorm)
  const distance = Math.abs(positionNorm - centerNorm) / width
  if (distance >= 1) return 0
  return Math.pow(1 - distance * distance, config.crestSharpness)
}

export function twoCrestPulse(
  positionNorm: number,
  leadCenterNorm: number,
  widthNorm: number,
  spacingNorm: number,
  config: MiniPlayerWobbleConfig = MINI_PROGRESS_WOBBLE
): number {
  const lead = singleCrestPulse(positionNorm, leadCenterNorm, widthNorm, config)
  const trailing =
    config.crestSecondaryWeight *
    singleCrestPulse(positionNorm, leadCenterNorm - spacingNorm, widthNorm, config)
  return clamp(Math.max(lead, trailing), 0, 1)
}

export function buildWavePoints(
  wave: TravelingWaveState,
  fillWidthPx: number,
  topY: number,
  config: MiniPlayerWobbleConfig = MINI_PROGRESS_WOBBLE,
  playedRatio = 1
): WavePoint[] {
  if (!wave.active || fillWidthPx <= 1 || wave.headPx <= 1) {
    return []
  }

  const points: WavePoint[] = []
  const centerNorm = wave.headPx / Math.max(1, fillWidthPx)
  const playedAmplitudeScale = amplitudeScaleFromPlayedRatio(playedRatio, config)

  for (let i = 0; i < config.waveSamples; i += 1) {
    const ratio = i / (config.waveSamples - 1)
    const x = clamp(ratio * fillWidthPx, 0, fillWidthPx)
    const envelope = edgeEnvelope(ratio, config)
    const crest = twoCrestPulse(
      ratio,
      centerNorm,
      wave.crestWidthNorm,
      wave.crestSpacingNorm,
      config
    )
    const amp =
      config.amplitudeMaxPx *
      playedAmplitudeScale *
      wave.amplitudeMultiplier *
      wave.amplitudeScale *
      envelope *
      crest
    points.push({ x, y: topY - amp })
  }

  points[0]!.y = topY
  points[points.length - 1]!.y = topY
  return points
}

export function filledWavePath(pts: WavePoint[], baselineY: number): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0]!.x.toFixed(2)} ${baselineY.toFixed(2)}`
  for (const pt of pts) {
    d += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`
  }
  d += ` L ${pts[pts.length - 1]!.x.toFixed(2)} ${baselineY.toFixed(2)} Z`
  return d
}

export function buildWavePathData(
  wave: TravelingWaveState,
  fillWidthPx: number,
  topY: number,
  config: MiniPlayerWobbleConfig = MINI_PROGRESS_WOBBLE,
  playedRatio = 1
): string {
  return filledWavePath(buildWavePoints(wave, fillWidthPx, topY, config, playedRatio), topY)
}
