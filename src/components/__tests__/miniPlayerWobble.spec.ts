import { describe, expect, it } from 'vitest'
import {
  MINI_PROGRESS_WOBBLE,
  amplitudeScaleFromPlayedRatio,
  buildWavePoints,
  makeWave,
  scheduleWaveRestart,
  updateWaveMotion,
} from '../miniPlayerWobble'

describe('miniPlayerWobble', () => {
  it('pins the wave geometry to the baseline at both endpoints', () => {
    const wave = makeWave({
      startDelaySec: 0,
      durationBiasSec: 0,
      amplitudeMultiplier: 1,
    })
    wave.active = true
    wave.headPx = 60
    wave.amplitudeScale = 1
    wave.crestWidthNorm = MINI_PROGRESS_WOBBLE.crestWidthNorm

    const topY = 6
    const points = buildWavePoints(wave, 120, topY)

    expect(points.length).toBe(MINI_PROGRESS_WOBBLE.waveSamples)
    expect(points[0]?.y).toBe(topY)
    expect(points.at(-1)?.y).toBe(topY)
    expect(points[0]?.x).toBe(0)
    expect(points.at(-1)?.x).toBe(120)
  })

  it('creates at most two crests across the played width', () => {
    const wave = makeWave({
      startDelaySec: 0,
      durationBiasSec: 0,
      amplitudeMultiplier: 1,
    })
    wave.active = true
    wave.headPx = 54
    wave.amplitudeScale = 1
    wave.crestWidthNorm = 0.22

    const topY = 6
    const amplitudes = buildWavePoints(wave, 120, topY).map((point) => topY - point.y)
    let crestCount = 0

    for (let i = 1; i < amplitudes.length - 1; i += 1) {
      const prev = amplitudes[i - 1] ?? 0
      const current = amplitudes[i] ?? 0
      const next = amplitudes[i + 1] ?? 0
      if (current > 0.01 && current > prev && current >= next) {
        crestCount += 1
      }
    }

    expect(crestCount).toBeLessThanOrEqual(2)
    expect(crestCount).toBeGreaterThanOrEqual(1)
  })

  it('scales maximum amplitude with played ratio until full-threshold ratio', () => {
    expect(amplitudeScaleFromPlayedRatio(0)).toBe(0)
    expect(amplitudeScaleFromPlayedRatio(MINI_PROGRESS_WOBBLE.amplitudeRampFullRatio)).toBe(1)

    const halfRatio =
      MINI_PROGRESS_WOBBLE.amplitudeRampStartRatio +
      (MINI_PROGRESS_WOBBLE.amplitudeRampFullRatio - MINI_PROGRESS_WOBBLE.amplitudeRampStartRatio) /
        2
    const halfScale = amplitudeScaleFromPlayedRatio(halfRatio)
    expect(halfScale).toBeGreaterThan(0.33)
    expect(halfScale).toBeLessThan(0.4)
  })

  it('keeps a visible tail near the end instead of disappearing abruptly', () => {
    const wave = makeWave({
      startDelaySec: 0,
      durationBiasSec: 0,
      amplitudeMultiplier: 1,
    })
    wave.active = true
    wave.headPx = 100 * 1.18
    wave.amplitudeScale = 1
    wave.crestWidthNorm = 0.24
    wave.crestSpacingNorm = 0.28

    const topY = 6
    const points = buildWavePoints(wave, 100, topY)
    const peakAmp = Math.max(...points.map((point) => topY - point.y))

    expect(points.length).toBeGreaterThan(0)
    expect(peakAmp).toBeGreaterThan(0.01)
  })

  it('reapplies stagger with jitter every time a wave finishes', () => {
    const primary = makeWave({
      startDelaySec: MINI_PROGRESS_WOBBLE.wavePrimaryStartDelaySec,
      startDelayJitterSec: MINI_PROGRESS_WOBBLE.wavePrimaryStartJitterSec,
      durationBiasSec: MINI_PROGRESS_WOBBLE.wavePrimaryDurationBiasSec,
      amplitudeMultiplier: MINI_PROGRESS_WOBBLE.wavePrimaryAmplitudeMultiplier,
    })
    const secondary = makeWave({
      startDelaySec: MINI_PROGRESS_WOBBLE.waveSecondaryStartDelaySec,
      startDelayJitterSec: MINI_PROGRESS_WOBBLE.waveSecondaryStartJitterSec,
      durationBiasSec: MINI_PROGRESS_WOBBLE.waveSecondaryDurationBiasSec,
      amplitudeMultiplier: MINI_PROGRESS_WOBBLE.waveSecondaryAmplitudeMultiplier,
    })

    primary.active = true
    primary.headPx = 157
    primary.durationSec = 2
    primary.speedPxPerSec = 100
    primary.targetSpeedPxPerSec = 100

    secondary.active = true
    secondary.headPx = 157
    secondary.durationSec = 2
    secondary.speedPxPerSec = 100
    secondary.targetSpeedPxPerSec = 100

    const nowSec = 10
    const fillWidthPx = 100
    const randomFn = () => 1

    updateWaveMotion(primary, 0.05, fillWidthPx, true, nowSec, MINI_PROGRESS_WOBBLE, randomFn)
    updateWaveMotion(secondary, 0.05, fillWidthPx, true, nowSec, MINI_PROGRESS_WOBBLE, randomFn)

    const restartFloor = Math.max(MINI_PROGRESS_WOBBLE.waveRestartDelaySec, 1 / 60)
    expect(primary.active).toBe(false)
    expect(secondary.active).toBe(false)
    expect(primary.restartAtSec).toBeCloseTo(
      nowSec +
        restartFloor +
        MINI_PROGRESS_WOBBLE.wavePrimaryStartDelaySec +
        MINI_PROGRESS_WOBBLE.wavePrimaryStartJitterSec
    )
    expect(secondary.restartAtSec).toBeCloseTo(
      nowSec +
        restartFloor +
        MINI_PROGRESS_WOBBLE.waveSecondaryStartDelaySec +
        MINI_PROGRESS_WOBBLE.waveSecondaryStartJitterSec
    )
    expect(secondary.restartAtSec).toBeGreaterThan(primary.restartAtSec)
  })

  it('can schedule a restart without reapplying start delay when explicitly requested', () => {
    const wave = makeWave({
      startDelaySec: 0.2,
      startDelayJitterSec: 0.1,
      durationBiasSec: 0,
      amplitudeMultiplier: 1,
    })

    scheduleWaveRestart(wave, 4, MINI_PROGRESS_WOBBLE, {
      includeStartDelay: false,
      randomFn: () => 1,
    })

    expect(wave.restartAtSec).toBeCloseTo(
      4 + Math.max(MINI_PROGRESS_WOBBLE.waveRestartDelaySec, 1 / 60)
    )
  })
})
