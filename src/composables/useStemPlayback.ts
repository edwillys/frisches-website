/**
 * useStemPlayback.ts
 *
 * Web Audio API composable that plays the sum of individual stem tracks through
 * a JUCE-style limiter, and gracefully crossfades with the master <audio> element.
 *
 * Audio graph per active stem:
 *   AudioBufferSourceNode(s) → itemGainNode(s) → stemGainNode → preGainNode
 *                                                                      ↓
 *                                                 JUCE limiter / fallback
 *                                                                      ↓
 *                                                              outputGainNode
 *                                                                      ↓
 *                                                          AudioContext.destination
 *
 * Crossfade strategy:
 *  - Master volume: ramps via requestAnimationFrame (HTMLMediaElement.volume is not
 *    an AudioParam — cannot use linearRampToValueAtTime).
 *  - Stems output: ramps via linearRampToValueAtTime on outputGainNode.
 */

import { ref, type Ref, type ComputedRef } from 'vue'
import type { AudioStemName } from '@/stores/audio'
import { stemAssetLoaders } from '@/data/stems'
import { type LimiterParams, DEFAULT_LIMITER_PARAMS } from '@/data/stemLimiter'

const JUCE_LIMITER_PROCESSOR = 'juce-limiter-processor'
const juceLimiterModuleByContext = new WeakMap<AudioContext, Promise<boolean>>()
let juceLimiterModuleUrl: string | null = null

const JUCE_LIMITER_WORKLET_SOURCE = `
function dbToGain(value, minDb = -200) {
  return value <= minDb ? 0 : Math.pow(10, value / 20)
}

class BallisticsFilter {
  constructor(sampleRate) {
    this.expFactor = (-2 * Math.PI * 1000) / sampleRate
    this.yold = [0, 0]
    this.setAttackTime(1)
    this.setReleaseTime(100)
  }

  setAttackTime(timeMs) {
    this.cteAT = timeMs < 1e-3 ? 0 : Math.exp(this.expFactor / timeMs)
  }

  setReleaseTime(timeMs) {
    this.cteRL = timeMs < 1e-3 ? 0 : Math.exp(this.expFactor / timeMs)
  }

  reset() {
    this.yold[0] = 0
    this.yold[1] = 0
  }

  processSample(channel, inputValue) {
    const rectified = Math.abs(inputValue)
    const cte = rectified > this.yold[channel] ? this.cteAT : this.cteRL
    const result = rectified + cte * (this.yold[channel] - rectified)
    this.yold[channel] = result
    return result
  }
}

class Compressor {
  constructor(sampleRate, thresholdDb, ratio, attackMs, releaseMs) {
    this.envelopeFilter = new BallisticsFilter(sampleRate)
    this.setThreshold(thresholdDb)
    this.setRatio(ratio)
    this.setAttack(attackMs)
    this.setRelease(releaseMs)
  }

  setThreshold(thresholdDb) {
    this.threshold = dbToGain(thresholdDb)
    this.thresholdInverse = this.threshold > 0 ? 1 / this.threshold : Number.POSITIVE_INFINITY
  }

  setRatio(ratio) {
    this.ratioInverse = 1 / ratio
  }

  setAttack(attackMs) {
    this.envelopeFilter.setAttackTime(attackMs)
  }

  setRelease(releaseMs) {
    this.envelopeFilter.setReleaseTime(releaseMs)
  }

  reset() {
    this.envelopeFilter.reset()
  }

  processSample(channel, inputValue) {
    const env = this.envelopeFilter.processSample(channel, inputValue)
    const gain = env < this.threshold ? 1 : Math.pow(env * this.thresholdInverse, this.ratioInverse - 1)
    return gain * inputValue
  }
}

class JuceLimiterCore {
  constructor(sampleRate) {
    this.firstStage = new Compressor(sampleRate, -10, 4, 2, 200)
    this.secondStage = new Compressor(sampleRate, -0.1, 1000, 0.001, 100)
    this.outputGain = 1
    this.update({ threshold: -0.1, releaseMs: 100 })
  }

  update({ threshold, releaseMs }) {
    this.secondStage.setThreshold(threshold)
    this.secondStage.setRatio(1000)
    this.secondStage.setAttack(0.001)
    this.secondStage.setRelease(releaseMs)
    this.outputGain = Math.pow(10, (10 * (1 - 0.25)) / 40) * dbToGain(-threshold, -100)
  }

  reset() {
    this.firstStage.reset()
    this.secondStage.reset()
  }

  processSample(channel, inputValue) {
    const firstStage = this.firstStage.processSample(channel, inputValue)
    const secondStage = this.secondStage.processSample(channel, firstStage) * this.outputGain
    return Math.max(-1, Math.min(1, secondStage))
  }
}

class JuceLimiterProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.limiter = new JuceLimiterCore(sampleRate)
    this.port.onmessage = (event) => {
      if (event.data?.type === 'params') {
        this.limiter.update({
          threshold: event.data.threshold ?? -0.1,
          releaseMs: event.data.releaseMs ?? 100,
        })
      } else if (event.data?.type === 'reset') {
        this.limiter.reset()
      }
    }
  }

  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    if (!output || output.length === 0) return true

    for (let channel = 0; channel < output.length; channel += 1) {
      const inputChannel = input[channel] ?? input[0]
      const outputChannel = output[channel]
      for (let index = 0; index < outputChannel.length; index += 1) {
        const sample = inputChannel?.[index] ?? 0
        outputChannel[index] = this.limiter.processSample(channel, sample)
      }
    }

    return true
  }
}

registerProcessor('${JUCE_LIMITER_PROCESSOR}', JuceLimiterProcessor)
`

function getJuceLimiterModuleUrl() {
  if (!juceLimiterModuleUrl) {
    juceLimiterModuleUrl = URL.createObjectURL(
      new Blob([JUCE_LIMITER_WORKLET_SOURCE], { type: 'text/javascript' })
    )
  }
  return juceLimiterModuleUrl
}

async function ensureJuceLimiterWorklet(ctx: AudioContext): Promise<boolean> {
  if (!('audioWorklet' in ctx) || !ctx.audioWorklet?.addModule) return false

  let readyPromise = juceLimiterModuleByContext.get(ctx)
  if (!readyPromise) {
    readyPromise = ctx.audioWorklet.addModule(getJuceLimiterModuleUrl()).then(
      () => true,
      (error) => {
        console.warn('[useStemPlayback] Falling back to DynamicsCompressorNode limiter.', error)
        return false
      }
    )
    juceLimiterModuleByContext.set(ctx, readyPromise)
  }

  return readyPromise
}

// ─── Types ────────────────────────────────────────────────────────────────────

// Re-export so callers that only import from this module still work.
export type { LimiterParams } from '@/data/stemLimiter'
export { DEFAULT_LIMITER_PARAMS } from '@/data/stemLimiter'

interface StemNode {
  buffers: AudioBuffer[]
  sources: AudioBufferSourceNode[]
  gainNode: GainNode
  itemGains: GainNode[]
}

type TimeDomainBuffer = Parameters<AnalyserNode['getFloatTimeDomainData']>[0]

function sampleAnalyserRms(analyser: AnalyserNode | null, buffer: TimeDomainBuffer | null): number {
  if (!analyser || !buffer) return 0
  analyser.getFloatTimeDomainData(buffer)

  let sumSquares = 0
  for (const sample of buffer) {
    sumSquares += sample * sample
  }

  return Math.sqrt(sumSquares / buffer.length)
}

// ─── Module-level ArrayBuffer cache (shared across all composable instances) ──
//
// Splitting the expensive network fetch from the cheap CPU decode means stems
// are pre-fetched in the background as soon as a track loads.  When the user
// actually enables the stem overlay the only remaining work is decodeAudioData,
// which typically takes < 100 ms per file.

const _arrayBufferCache = new Map<string, Promise<ArrayBuffer | null>>()

function _fetchArrayBuffer(assetPath: string): Promise<ArrayBuffer | null> {
  if (_arrayBufferCache.has(assetPath)) return _arrayBufferCache.get(assetPath)!

  const promise = (async (): Promise<ArrayBuffer | null> => {
    const loader = stemAssetLoaders[assetPath]
    if (!loader) {
      console.warn(`[useStemPlayback] No asset loader for: ${assetPath}`)
      return null
    }
    try {
      const mod = await loader()
      const url = (mod as { default: string }).default
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.arrayBuffer()
    } catch (err) {
      console.warn(`[useStemPlayback] Failed to fetch: ${assetPath}`, err)
      _arrayBufferCache.delete(assetPath) // allow retry on next attempt
      return null
    }
  })()

  _arrayBufferCache.set(assetPath, promise)
  return promise
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useStemPlayback(
  masterAudioEl: Ref<HTMLAudioElement | null>,
  stemGains: ComputedRef<Partial<Record<AudioStemName, number>>>,
  groupGains: ComputedRef<Record<string, number>>,
  limiterParams: LimiterParams = DEFAULT_LIMITER_PARAMS
) {
  let currentLimiterParams: LimiterParams = { ...limiterParams }
  let audioCtx: AudioContext | null = null
  const isActive = ref(false)
  // Becomes true once _preloadForSources() has finished fetching + decoding.
  // Callers can wait on this to guarantee near-instant activation.
  const isStemsPrebuffered = ref(false)
  // Generation counter: incremented on every new operation so in-flight
  // activate/deactivate callbacks can detect they have been superseded.
  let _opGen = 0
  let _preloadGen = 0

  // Per-instance decoded AudioBuffer cache.  AudioBuffers are tied to an
  // AudioContext, so we invalidate whenever the context changes.
  let _decodedCache = new Map<string, Promise<AudioBuffer | null>>()
  let _decodedCacheCtx: AudioContext | null = null

  function _getCachedDecodedBuffer(
    ctx: AudioContext,
    assetPath: string
  ): Promise<AudioBuffer | null> {
    if (ctx !== _decodedCacheCtx) {
      _decodedCache = new Map()
      _decodedCacheCtx = ctx
    }
    if (!_decodedCache.has(assetPath)) {
      _decodedCache.set(assetPath, loadBuffer(ctx, assetPath))
    }
    return _decodedCache.get(assetPath)!
  }

  const stemNodes = new Map<AudioStemName, StemNode>()
  let outputGain: GainNode | null = null
  let compressor: DynamicsCompressorNode | null = null
  let limiterWorkletNode: AudioWorkletNode | null = null
  let limiterNode: AudioNode | null = null
  let preGainNode: GainNode | null = null
  let outputAnalyser: AnalyserNode | null = null
  let outputAnalyserBuffer: TimeDomainBuffer | null = null

  let stemSources: Partial<Record<AudioStemName, string[]>> = {}

  // Ongoing rAF handles for master volume fades — cancel if a new fade starts
  let _masterFadeRaf: number | null = null

  // ─── AudioContext management ────────────────────────────────────────────────

  function ensureContext(): AudioContext {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext()
    }
    return audioCtx
  }

  // ─── Graph construction ─────────────────────────────────────────────────────

  async function buildGraph(ctx: AudioContext): Promise<{
    outputGain: GainNode
    preGainNode: GainNode
  }> {
    const nextOutputGain = ctx.createGain()
    nextOutputGain.gain.value = 0

    const nextOutputAnalyser = ctx.createAnalyser()
    nextOutputAnalyser.fftSize = 2048
    nextOutputAnalyser.smoothingTimeConstant = 0
    nextOutputGain.connect(nextOutputAnalyser)
    nextOutputAnalyser.connect(ctx.destination)

    const nextPreGainNode = ctx.createGain()
    nextPreGainNode.gain.value = Math.pow(10, currentLimiterParams.preGainDb / 20)

    if (await ensureJuceLimiterWorklet(ctx)) {
      limiterWorkletNode = new AudioWorkletNode(ctx, JUCE_LIMITER_PROCESSOR, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      })
      limiterWorkletNode.port.postMessage({
        type: 'params',
        threshold: currentLimiterParams.threshold,
        releaseMs: currentLimiterParams.release * 1000,
      })
      limiterNode = limiterWorkletNode
      limiterNode.connect(nextOutputGain)
    } else {
      compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = currentLimiterParams.threshold
      compressor.knee.value = currentLimiterParams.knee
      compressor.ratio.value = currentLimiterParams.ratio
      compressor.attack.value = currentLimiterParams.attack
      compressor.release.value = currentLimiterParams.release
      limiterNode = compressor
      limiterNode.connect(nextOutputGain)
    }

    nextPreGainNode.connect(limiterNode)
    outputGain = nextOutputGain
    preGainNode = nextPreGainNode
    outputAnalyser = nextOutputAnalyser
    outputAnalyserBuffer = new Float32Array(nextOutputAnalyser.fftSize) as TimeDomainBuffer

    return {
      outputGain: nextOutputGain,
      preGainNode: nextPreGainNode,
    }
  }

  // ─── Asset loading ──────────────────────────────────────────────────────────

  async function loadBuffer(ctx: AudioContext, assetPath: string): Promise<AudioBuffer | null> {
    // The fetch is cached at module level — only the decode step runs here.
    const arrayBuffer = await _fetchArrayBuffer(assetPath)
    if (!arrayBuffer) return null
    try {
      // decodeAudioData() detaches the buffer in some browsers, so pass a copy
      // each time while keeping the cached original intact.
      return await ctx.decodeAudioData(arrayBuffer.slice(0))
    } catch (err) {
      console.warn(`[useStemPlayback] Failed to decode: ${assetPath}`, err)
      return null
    }
  }

  async function loadAllStems(
    ctx: AudioContext,
    sources: Partial<Record<AudioStemName, string[]>>,
    stemDestination: AudioNode
  ): Promise<void> {
    const entries = Object.entries(sources) as [AudioStemName, string[]][]

    await Promise.all(
      entries.map(async ([stemName, paths]) => {
        if (!paths?.length) return

        const buffers = (
          await Promise.all(paths.map((p) => _getCachedDecodedBuffer(ctx, p)))
        ).filter(Boolean) as AudioBuffer[]

        if (buffers.length === 0) return

        const stemGain = ctx.createGain()
        stemGain.gain.value = Math.max(0, Math.min(1, stemGains.value[stemName] ?? 1))
        stemGain.connect(stemDestination)

        const itemGains: GainNode[] = paths.map((_, idx) => {
          const g = ctx.createGain()
          g.gain.value = Math.max(0, Math.min(1, groupGains.value[`${stemName}-${idx}`] ?? 1))
          g.connect(stemGain)
          return g
        })

        stemNodes.set(stemName, {
          buffers,
          sources: [],
          gainNode: stemGain,
          itemGains,
        })
      })
    )
  }

  // ─── Source scheduling ──────────────────────────────────────────────────────

  function startAllSources(ctx: AudioContext, offsetSeconds: number): void {
    const ctxNow = ctx.currentTime

    for (const [, node] of stemNodes) {
      node.sources = node.buffers.map((buffer, idx) => {
        const src = ctx.createBufferSource()
        src.buffer = buffer

        const dest = node.itemGains[idx] ?? node.gainNode
        src.connect(dest)

        const safeOffset = Math.max(0, Math.min(offsetSeconds, buffer.duration - 0.001))
        src.start(ctxNow, safeOffset)
        return src
      })
    }
  }

  function stopAllSources(): void {
    for (const [, node] of stemNodes) {
      for (const src of node.sources) {
        try {
          src.stop()
        } catch {
          // already stopped
        }
      }
      node.sources = []
    }
  }

  // ─── Master volume fade helpers (rAF-based) ─────────────────────────────────

  function _cancelMasterFade(): void {
    if (_masterFadeRaf !== null) {
      cancelAnimationFrame(_masterFadeRaf)
      _masterFadeRaf = null
    }
  }

  function _fadeMasterVolume(
    el: HTMLAudioElement,
    from: number,
    to: number,
    durationMs: number
  ): void {
    _cancelMasterFade()
    const start = performance.now()
    function tick(): void {
      const elapsed = performance.now() - start
      const t = Math.min(1, elapsed / durationMs)
      el.volume = from + (to - from) * t
      if (t < 1) {
        _masterFadeRaf = requestAnimationFrame(tick)
      } else {
        _masterFadeRaf = null
      }
    }
    _masterFadeRaf = requestAnimationFrame(tick)
  }

  // ─── Activate / deactivate ──────────────────────────────────────────────────

  const FADE_MS = 300

  /**
   * Switch from master-track playback to stems playback.
   * @param currentTimeSeconds Current playback position to synchronise all stems to.
   */
  async function activate(currentTimeSeconds: number): Promise<void> {
    if (Object.keys(stemSources).length === 0) return

    // Increment generation — any superseded in-flight operation will bail when it
    // checks the generation after its next `await`.
    const gen = ++_opGen
    _cancelMasterFade()

    if (isActive.value) return // shouldn't happen in normal flow; handled by caller

    // Force-clean any zombie nodes from a superseded deactivate timeout.
    _disposeGraph()

    const ctx = ensureContext()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    if (gen !== _opGen) return // superseded

    const activeSources = stemSources
    const graph = await buildGraph(ctx)
    if (gen !== _opGen) {
      _disposeGraph()
      return
    } // superseded after graph build

    await loadAllStems(ctx, activeSources, graph.preGainNode)
    if (gen !== _opGen) {
      _disposeGraph()
      return
    } // superseded during load

    if (stemNodes.size === 0) {
      // Nothing loaded — bail out silently
      _disposeGraph()
      return
    }

    const liveTime = masterAudioEl.value?.currentTime
    const startAt =
      typeof liveTime === 'number' && Number.isFinite(liveTime) ? liveTime : currentTimeSeconds

    startAllSources(ctx, startAt)

    // Crossfade: stems in, master out
    const now = ctx.currentTime
    graph.outputGain.gain.setValueAtTime(0, now)
    graph.outputGain.gain.linearRampToValueAtTime(1, now + FADE_MS / 1000)

    const masterEl = masterAudioEl.value
    if (masterEl) {
      _fadeMasterVolume(masterEl, masterEl.volume, 0, FADE_MS)
    }

    if (gen === _opGen) {
      isActive.value = true
    } else {
      // Superseded after sources started — tear down immediately
      stopAllSources()
      _disposeGraph()
    }
  }

  /**
   * Switch back from stems playback to master-track playback.
   */
  async function deactivate(): Promise<void> {
    return deactivateWithOptions()
  }

  async function deactivateWithOptions(options?: { restoreMasterVolume?: boolean }): Promise<void> {
    // Always increment generation to cancel any in-flight activate.
    const gen = ++_opGen
    _cancelMasterFade()

    // If nothing is active and no graph exists there is nothing to do.
    if (!isActive.value && !outputGain) return

    // Reflect intent immediately — callers and concurrent operations see updated
    // state right away without waiting for the fade to finish.
    isActive.value = false

    const ctx = audioCtx
    if (!ctx) return

    // Crossfade: stems out, master in
    const now = ctx.currentTime
    const currentOutputGainValue = outputGain?.gain.value ?? 0
    outputGain?.gain.setValueAtTime(currentOutputGainValue, now)
    outputGain?.gain.linearRampToValueAtTime(0, now + FADE_MS / 1000)

    const masterEl = masterAudioEl.value
    if (masterEl && options?.restoreMasterVolume !== false) {
      _fadeMasterVolume(masterEl, masterEl.volume, 1, FADE_MS)
    }

    setTimeout(() => {
      if (gen !== _opGen) return // superseded by a newer operation
      stopAllSources()
      _disposeGraph()
    }, FADE_MS + 50)
  }

  function seek(currentTimeSeconds: number): void {
    // seek is always allowed when stems are active — no transition lock
    if (!isActive.value || !audioCtx) return
    limiterWorkletNode?.port.postMessage({ type: 'reset' })
    stopAllSources()
    startAllSources(audioCtx, currentTimeSeconds)
  }

  /** Suspend the AudioContext (freeze stems output) — call when master is paused. */
  function suspend(): void {
    if (audioCtx?.state === 'running') {
      void audioCtx.suspend()
    }
  }

  /** Resume the AudioContext — call when master playback resumes. */
  function resume(): void {
    if (audioCtx?.state === 'suspended') {
      void audioCtx.resume()
    }
  }

  /**
   * Pre-warm the audio pipeline so that enabling stems is near-instant.
   * Call this as soon as the user starts playing audio — it resumes the
   * AudioContext so stems can start playing immediately when enabled.
   * Buffer pre-decoding happens earlier in setSources() / _preloadForSources().
   */
  async function warmUp(): Promise<void> {
    if (!audioCtx) return // context created by _preloadForSources
    // Best-effort resume; if activation is missing activate() will retry.
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {
        /* retry in activate() */
      })
    }
  }

  function setLimiterParams(nextParams: Partial<LimiterParams> | null | undefined): void {
    currentLimiterParams = {
      ...DEFAULT_LIMITER_PARAMS,
      ...(nextParams ?? {}),
    }

    if (preGainNode) {
      preGainNode.gain.value = Math.pow(10, currentLimiterParams.preGainDb / 20)
    }

    if (limiterWorkletNode) {
      limiterWorkletNode.port.postMessage({
        type: 'params',
        threshold: currentLimiterParams.threshold,
        releaseMs: currentLimiterParams.release * 1000,
      })
    }

    if (compressor) {
      compressor.threshold.value = currentLimiterParams.threshold
      compressor.knee.value = currentLimiterParams.knee
      compressor.ratio.value = currentLimiterParams.ratio
      compressor.attack.value = currentLimiterParams.attack
      compressor.release.value = currentLimiterParams.release
    }
  }

  // ─── Real-time gain updates ─────────────────────────────────────────────────

  /** Update a stem's group-level gain in real time (while active). */
  function updateStemGain(stem: AudioStemName, gain: number): void {
    const node = stemNodes.get(stem)
    if (node) {
      node.gainNode.gain.value = Math.max(0, Math.min(1, gain))
    }
  }

  /** Update an individual item gain within a grouped stem (while active). */
  function updateGroupItemGain(stem: AudioStemName, index: number, gain: number): void {
    const node = stemNodes.get(stem)
    const itemGain = node?.itemGains[index]
    if (itemGain) {
      itemGain.gain.value = Math.max(0, Math.min(1, gain))
    }
  }

  function getOutputLevel(): number {
    if (!isActive.value) return 0
    return sampleAnalyserRms(outputAnalyser, outputAnalyserBuffer)
  }

  // ─── Source management ──────────────────────────────────────────────────────

  /**
   * Replace the stem audio sources. If stems are currently active, deactivates first.
   * Call this whenever the current track changes.
   */
  function setSources(sources: Partial<Record<AudioStemName, string[]>>): void {
    ++_opGen
    _cancelMasterFade()

    if (isActive.value) {
      void deactivate()
    } else {
      stopAllSources()
      _disposeGraph()
    }

    // Evict ArrayBuffer cache entries that are no longer needed for the new track.
    const nextPaths = new Set((Object.values(sources) as string[][]).flat().filter(Boolean))
    for (const path of _arrayBufferCache.keys()) {
      if (!nextPaths.has(path)) {
        _arrayBufferCache.delete(path)
      }
    }

    stemSources = sources
    isStemsPrebuffered.value = false
    const preloadGen = ++_preloadGen

    // Kick off full background pre-warm immediately — no user gesture is needed
    // for either network fetching or decodeAudioData (works on suspended contexts).
    // By the time the user enables stems, all AudioBuffers should be ready.
    void _preloadForSources(sources, preloadGen)
  }

  async function _preloadForSources(
    sources: Partial<Record<AudioStemName, string[]>>,
    preloadGen: number
  ): Promise<void> {
    const allPaths = (Object.values(sources) as string[][]).flat().filter(Boolean)
    if (allPaths.length === 0) return

    // Step 1: fetch all ArrayBuffers in parallel (network I/O only).
    await Promise.all(allPaths.map((p) => _fetchArrayBuffer(p)))
    if (preloadGen !== _preloadGen) return

    // Step 2: create/reuse the AudioContext (starts suspended — that is fine).
    const ctx = ensureContext()

    // Step 3: register the worklet module so buildGraph() is synchronous later.
    await ensureJuceLimiterWorklet(ctx)
    if (preloadGen !== _preloadGen) return

    // Step 4: decode all AudioBuffers.  Results are cached; loadAllStems() reads
    // from cache so the user experiences no decode latency when enabling stems.
    await Promise.all(allPaths.map((p) => _getCachedDecodedBuffer(ctx, p)))
    if (preloadGen !== _preloadGen) return

    isStemsPrebuffered.value = true
  }

  // ─── Internal cleanup ───────────────────────────────────────────────────────

  function _disposeGraph(): void {
    stopAllSources()
    stemNodes.clear()
    try {
      outputGain?.disconnect()
    } catch {
      /* ignore */
    }
    outputGain = null
    try {
      outputAnalyser?.disconnect()
    } catch {
      /* ignore */
    }
    outputAnalyser = null
    outputAnalyserBuffer = null
    try {
      limiterNode?.disconnect()
    } catch {
      /* ignore */
    }
    compressor = null
    limiterWorkletNode = null
    limiterNode = null
    try {
      preGainNode?.disconnect()
    } catch {
      /* ignore */
    }
    preGainNode = null
  }

  function dispose(): void {
    _cancelMasterFade()
    ++_opGen // cancel any in-flight activate / deactivate
    _disposeGraph()
    try {
      audioCtx?.close()
    } catch {
      // ignore
    }
    audioCtx = null
    isActive.value = false
  }

  return {
    isActive,
    isStemsPrebuffered,
    activate,
    deactivate,
    deactivateWithOptions,
    seek,
    suspend,
    resume,
    warmUp,
    setLimiterParams,
    updateStemGain,
    updateGroupItemGain,
    getOutputLevel,
    setSources,
    dispose,
  }
}
