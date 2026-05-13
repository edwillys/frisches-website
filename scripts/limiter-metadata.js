#!/usr/bin/env node
/**
 * limiter-metadata.js
 *
 * JS equivalent of scripts/loudness_matcher.py using the same end-user contract:
 *   node scripts/limiter-metadata.js --master="..." --stems="..."
 *
 * Pipeline:
 * - measure master loudness via FFmpeg ebur128
 * - decode master + stems in headless Chromium
 * - binary-search pre-gain into a JUCE-style limiter that matches Pedalboard's
 *   built-in Limiter semantics
 * - align the rendered mix to the master via correlation on a 30 second chunk
 * - export JSON metadata and an optional limited stems mix file
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'

const LIMITER_PARAMS = {
  threshold: -0.1,
  releaseMs: 100,
}

function getArg(name, fallback = undefined) {
  const flag = `--${name}`
  const exact = process.argv.find((arg) => arg.startsWith(`${flag}=`))
  if (exact) return exact.slice(flag.length + 1)
  const index = process.argv.indexOf(flag)
  if (index !== -1 && index < process.argv.length - 1) return process.argv[index + 1]
  return fallback
}

function round2(value) {
  return Math.round(value * 100) / 100
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}\n${result.stderr}`)
  }

  return result
}

function getFfprobeSampleRate(filePath) {
  const result = run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'a:0',
    '-show_entries',
    'stream=sample_rate',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ])
  const sampleRate = Number(result.stdout.trim())
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error(`Could not determine sample rate for ${filePath}`)
  }
  return sampleRate
}

function getFfmpegLoudness(filePath) {
  const result = spawnSync(
    'ffmpeg',
    ['-nostats', '-i', filePath, '-filter_complex', 'ebur128', '-f', 'null', '-'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  )

  if (result.error) throw result.error

  const output = result.stderr ?? ''
  const iMatches = [...output.matchAll(/I:\s+(-?\d+\.\d+) LUFS/g)].map((match) => Number(match[1]))
  const lraMatches = [...output.matchAll(/LRA:\s+(\d+\.\d+) LU/g)].map((match) => Number(match[1]))
  const mMatches = [...output.matchAll(/M:\s*(-?\d+\.\d+)/g)].map((match) => Number(match[1]))
  const sMatches = [...output.matchAll(/S:\s*(-?\d+\.\d+)/g)].map((match) => Number(match[1]))

  if (iMatches.length === 0 || lraMatches.length === 0) {
    throw new Error(`Could not find loudness stats in FFmpeg output for ${filePath}`)
  }

  return {
    lufs_i: iMatches.at(-1),
    lra: lraMatches.at(-1),
    lufs_m_max: mMatches.length ? Math.max(...mMatches) : -70,
    lufs_s_max: sMatches.length ? Math.max(...sMatches) : -70,
  }
}

function listStemFiles(stemsDir) {
  return fs
    .readdirSync(stemsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(stemsDir, entry.name))
    .filter((filePath) => ['.wav', '.mp3'].includes(path.extname(filePath).toLowerCase()))
    .sort((left, right) => left.localeCompare(right))
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.wav') return 'audio/wav'
  return 'application/octet-stream'
}

async function startFileServer(routes) {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname
    if (pathname === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      })
      res.end('<!doctype html><html><body></body></html>')
      return
    }
    const filePath = routes.get(pathname)
    if (!filePath) {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' })
      res.end('Not found')
      return
    }
    res.writeHead(200, {
      'Content-Type': contentTypeFor(filePath),
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    })
    fs.createReadStream(filePath).pipe(res)
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Could not determine local server port')
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  }
}

function writeFloatStereoWav(filePath, left, right, sampleRate) {
  const frameCount = left.length
  const channelCount = 2
  const bytesPerSample = 4
  const dataLength = frameCount * channelCount * bytesPerSample
  const buffer = Buffer.alloc(44 + dataLength)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataLength, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(3, 20)
  buffer.writeUInt16LE(channelCount, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28)
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32)
  buffer.writeUInt16LE(bytesPerSample * 8, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataLength, 40)

  for (let index = 0; index < frameCount; index += 1) {
    const offset = 44 + index * channelCount * bytesPerSample
    buffer.writeFloatLE(left[index] ?? 0, offset)
    buffer.writeFloatLE(right[index] ?? left[index] ?? 0, offset + bytesPerSample)
  }

  fs.writeFileSync(filePath, buffer)
}

async function renderLimitedMix({
  masterUrl,
  stemUrls,
  sampleRate,
  tolerance,
  targetLufsI,
  fixedDriveDb,
}) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(new URL(masterUrl).origin)

  try {
    return await page.evaluate(
      async ({
        masterUrl,
        stemUrls,
        sampleRate,
        tolerance,
        targetLufsI,
        limiterParams,
        fixedDriveDb,
      }) => {
        function measureLufsI(left, right, sr) {
          function applyBiquad(samples, coeffs) {
            const out = new Float32Array(samples.length)
            let x1 = 0
            let x2 = 0
            let y1 = 0
            let y2 = 0
            for (let index = 0; index < samples.length; index += 1) {
              const x0 = samples[index]
              const y0 =
                coeffs.b0 * x0 + coeffs.b1 * x1 + coeffs.b2 * x2 - coeffs.a1 * y1 - coeffs.a2 * y2
              out[index] = y0
              x2 = x1
              x1 = x0
              y2 = y1
              y1 = y0
            }
            return out
          }

          function kWeight(samples, sr) {
            const f0 = 1681.974450955533
            const gain = 3.999843853973347
            const q = 0.7071752369554196
            const k = Math.tan((Math.PI * f0) / sr)
            const vh = Math.pow(10, gain / 20)
            const vb = Math.pow(vh, 0.4996667741545416)
            const a0 = 1 + k / q + k * k
            return applyBiquad(samples, {
              b0: (vh + (vb * k) / q + k * k) / a0,
              b1: (2 * (k * k - vh)) / a0,
              b2: (vh - (vb * k) / q + k * k) / a0,
              a1: (2 * (k * k - 1)) / a0,
              a2: (1 - k / q + k * k) / a0,
            })
          }

          function highPass(samples, sr) {
            const f0 = 38.13547087602444
            const q = 0.5003270373238773
            const k = Math.tan((Math.PI * f0) / sr)
            const a0 = 1 + k / q + k * k
            return applyBiquad(samples, {
              b0: 1 / a0,
              b1: -2 / a0,
              b2: 1 / a0,
              a1: (2 * (k * k - 1)) / a0,
              a2: (1 - k / q + k * k) / a0,
            })
          }

          const weightedLeft = highPass(kWeight(left, sr), sr)
          const weightedRight = highPass(kWeight(right, sr), sr)
          const blockSize = Math.floor(sr * 0.4)
          const hopSize = Math.floor(blockSize * 0.25)
          const blocks = []
          for (let start = 0; start + blockSize <= weightedLeft.length; start += hopSize) {
            let sum = 0
            for (let index = start; index < start + blockSize; index += 1) {
              sum +=
                weightedLeft[index] * weightedLeft[index] +
                weightedRight[index] * weightedRight[index]
            }
            blocks.push(sum / blockSize)
          }
          const absThreshold = Math.pow(10, -70 / 10)
          const gated1 = blocks.filter((value) => value > absThreshold)
          if (gated1.length === 0) return -Infinity
          const avg1 = gated1.reduce((sum, value) => sum + value, 0) / gated1.length
          const relThreshold = avg1 * Math.pow(10, -10 / 10)
          const gated2 = blocks.filter((value) => value > relThreshold)
          if (gated2.length === 0) return -Infinity
          const avg2 = gated2.reduce((sum, value) => sum + value, 0) / gated2.length
          return -0.691 + 10 * Math.log10(avg2)
        }

        async function fetchBuffer(audioContext, url) {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`HTTP ${response.status} while loading ${url}`)
          return await audioContext.decodeAudioData(await response.arrayBuffer())
        }

        function stereoChannels(buffer) {
          if ('left' in buffer && 'right' in buffer) {
            return [buffer.left, buffer.right]
          }
          const left = buffer.getChannelData(0)
          const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left
          return [left, right]
        }

        function dbToGain(value, minDb = -200) {
          return value <= minDb ? 0 : Math.pow(10, value / 20)
        }

        function createBallisticsFilter(sampleRate, attackMs, releaseMs) {
          const expFactor = (-2 * Math.PI * 1000) / sampleRate
          const cteAT = attackMs < 1e-3 ? 0 : Math.exp(expFactor / attackMs)
          const cteRL = releaseMs < 1e-3 ? 0 : Math.exp(expFactor / releaseMs)
          const yold = [0, 0]

          return {
            processSample(channel, inputValue) {
              const rectified = Math.abs(inputValue)
              const cte = rectified > yold[channel] ? cteAT : cteRL
              const result = rectified + cte * (yold[channel] - rectified)
              yold[channel] = result
              return result
            },
          }
        }

        function createCompressor(sampleRate, thresholdDb, ratio, attackMs, releaseMs) {
          const threshold = dbToGain(thresholdDb)
          const thresholdInverse = threshold > 0 ? 1 / threshold : Number.POSITIVE_INFINITY
          const ratioInverse = 1 / ratio
          const envelopeFilter = createBallisticsFilter(sampleRate, attackMs, releaseMs)

          return {
            processSample(channel, inputValue) {
              const env = envelopeFilter.processSample(channel, inputValue)
              const gain = env < threshold ? 1 : Math.pow(env * thresholdInverse, ratioInverse - 1)
              return gain * inputValue
            },
          }
        }

        function createJuceLimiter(sampleRate, thresholdDb, releaseMs) {
          const firstStage = createCompressor(sampleRate, -10, 4, 2, 200)
          const secondStage = createCompressor(sampleRate, thresholdDb, 1000, 0.001, releaseMs)
          const outputGain = Math.pow(10, (10 * (1 - 0.25)) / 40) * dbToGain(-thresholdDb, -100)

          return {
            process(left, right) {
              for (let index = 0; index < left.length; index += 1) {
                const limitedLeft =
                  secondStage.processSample(0, firstStage.processSample(0, left[index])) *
                  outputGain
                const limitedRight =
                  secondStage.processSample(1, firstStage.processSample(1, right[index])) *
                  outputGain
                left[index] = Math.max(-1, Math.min(1, limitedLeft))
                right[index] = Math.max(-1, Math.min(1, limitedRight))
              }
            },
          }
        }

        function nextPowerOfTwo(value) {
          let power = 1
          while (power < value) power <<= 1
          return power
        }

        function fft(re, im, inverse = false) {
          const size = re.length
          for (let index = 1, bitIndex = 0; index < size; index += 1) {
            let bit = size >> 1
            while (bitIndex & bit) {
              bitIndex ^= bit
              bit >>= 1
            }
            bitIndex ^= bit
            if (index < bitIndex) {
              ;[re[index], re[bitIndex]] = [re[bitIndex], re[index]]
              ;[im[index], im[bitIndex]] = [im[bitIndex], im[index]]
            }
          }
          for (let len = 2; len <= size; len <<= 1) {
            const angle = ((inverse ? 1 : -1) * 2 * Math.PI) / len
            const wlenCos = Math.cos(angle)
            const wlenSin = Math.sin(angle)
            for (let offset = 0; offset < size; offset += len) {
              let wCos = 1
              let wSin = 0
              for (let index = 0; index < len / 2; index += 1) {
                const evenIndex = offset + index
                const oddIndex = evenIndex + len / 2
                const uRe = re[evenIndex]
                const uIm = im[evenIndex]
                const vRe = re[oddIndex] * wCos - im[oddIndex] * wSin
                const vIm = re[oddIndex] * wSin + im[oddIndex] * wCos
                re[evenIndex] = uRe + vRe
                im[evenIndex] = uIm + vIm
                re[oddIndex] = uRe - vRe
                im[oddIndex] = uIm - vIm
                const nextCos = wCos * wlenCos - wSin * wlenSin
                const nextSin = wCos * wlenSin + wSin * wlenCos
                wCos = nextCos
                wSin = nextSin
              }
            }
          }
          if (inverse) {
            for (let index = 0; index < size; index += 1) {
              re[index] /= size
              im[index] /= size
            }
          }
        }

        function correlationLag(masterMono, mixMono) {
          const fullLength = masterMono.length + mixMono.length - 1
          const fftLength = nextPowerOfTwo(fullLength)
          const masterRe = new Float64Array(fftLength)
          const masterIm = new Float64Array(fftLength)
          const mixRe = new Float64Array(fftLength)
          const mixIm = new Float64Array(fftLength)
          masterRe.set(masterMono)
          for (let index = 0; index < mixMono.length; index += 1) {
            mixRe[index] = mixMono[mixMono.length - 1 - index]
          }
          fft(masterRe, masterIm)
          fft(mixRe, mixIm)
          for (let index = 0; index < fftLength; index += 1) {
            const re = masterRe[index] * mixRe[index] - masterIm[index] * mixIm[index]
            const im = masterRe[index] * mixIm[index] + masterIm[index] * mixRe[index]
            masterRe[index] = re
            masterIm[index] = im
          }
          fft(masterRe, masterIm, true)
          let bestIndex = 0
          let bestValue = -Infinity
          for (let index = 0; index < fullLength; index += 1) {
            if (masterRe[index] > bestValue) {
              bestValue = masterRe[index]
              bestIndex = index
            }
          }
          return bestIndex - (mixMono.length - 1)
        }

        function decimate(samples, factor) {
          if (factor <= 1) return samples
          const out = new Float32Array(Math.ceil(samples.length / factor))
          let writeIndex = 0
          for (let index = 0; index < samples.length; index += factor) {
            out[writeIndex] = samples[index]
            writeIndex += 1
          }
          return out
        }

        function dotAtLag(masterMono, mixMono, lag) {
          const masterStart = Math.max(0, lag)
          const mixStart = Math.max(0, -lag)
          const length = Math.min(masterMono.length - masterStart, mixMono.length - mixStart)
          let sum = 0
          for (let index = 0; index < length; index += 1) {
            sum += masterMono[masterStart + index] * mixMono[mixStart + index]
          }
          return sum
        }

        function estimateLag(masterMono, mixMono, sr) {
          const factor = Math.max(1, Math.floor(sr / 4000))
          const coarse =
            correlationLag(decimate(masterMono, factor), decimate(mixMono, factor)) * factor
          const searchWindow = Math.max(64, factor * 8)
          let bestLag = coarse
          let bestScore = -Infinity
          for (let lag = coarse - searchWindow; lag <= coarse + searchWindow; lag += 1) {
            const score = dotAtLag(masterMono, mixMono, lag)
            if (score > bestScore) {
              bestScore = score
              bestLag = lag
            }
          }
          return bestLag
        }

        function alignAndTrim(masterBuffer, mixBuffer, sr) {
          const [masterLeft, masterRight] = stereoChannels(masterBuffer)
          const [mixLeft, mixRight] = stereoChannels(mixBuffer)
          const maxSamples = Math.min(masterLeft.length, mixLeft.length, sr * 30)
          const masterMono = new Float32Array(maxSamples)
          const mixMono = new Float32Array(maxSamples)
          for (let index = 0; index < maxSamples; index += 1) {
            masterMono[index] = (masterLeft[index] + masterRight[index]) * 0.5
            mixMono[index] = (mixLeft[index] + mixRight[index]) * 0.5
          }
          const lag = estimateLag(masterMono, mixMono, sr)
          const alignedLeft = new Float32Array(masterLeft.length)
          const alignedRight = new Float32Array(masterRight.length)
          if (lag > 0) {
            const validLength = Math.min(masterLeft.length - lag, mixLeft.length)
            alignedLeft.set(mixLeft.subarray(0, validLength), lag)
            alignedRight.set(mixRight.subarray(0, validLength), lag)
          } else if (lag < 0) {
            const lagAbs = Math.abs(lag)
            const validLength = Math.min(masterLeft.length, mixLeft.length - lagAbs)
            alignedLeft.set(mixLeft.subarray(lagAbs, lagAbs + validLength), 0)
            alignedRight.set(mixRight.subarray(lagAbs, lagAbs + validLength), 0)
          } else {
            const validLength = Math.min(masterLeft.length, mixLeft.length)
            alignedLeft.set(mixLeft.subarray(0, validLength), 0)
            alignedRight.set(mixRight.subarray(0, validLength), 0)
          }
          return {
            lag,
            left: Array.from(alignedLeft),
            right: Array.from(alignedRight),
          }
        }

        async function renderWithDrive(stemBuffers, preGainDb) {
          const maxLength = Math.max(...stemBuffers.map((buffer) => buffer.length))
          const mixLeft = new Float32Array(maxLength)
          const mixRight = new Float32Array(maxLength)
          const preGain = dbToGain(preGainDb)

          for (const buffer of stemBuffers) {
            const [left, right] = stereoChannels(buffer)
            for (let index = 0; index < buffer.length; index += 1) {
              mixLeft[index] += left[index] * preGain
              mixRight[index] += right[index] * preGain
            }
          }

          createJuceLimiter(sampleRate, limiterParams.threshold, limiterParams.releaseMs).process(
            mixLeft,
            mixRight
          )

          return {
            left: mixLeft,
            right: mixRight,
          }
        }

        const decodeContext = new AudioContext({ sampleRate })
        const masterBuffer = await fetchBuffer(decodeContext, masterUrl)
        const stemBuffers = await Promise.all(
          stemUrls.map((url) => fetchBuffer(decodeContext, url))
        )
        let bestDrive = fixedDriveDb
        if (bestDrive == null) {
          let initialRendered = await renderWithDrive(stemBuffers, 0)
          let [initialLeft, initialRight] = stereoChannels(initialRendered)
          const initialStemLufs = measureLufsI(initialLeft, initialRight, sampleRate)
          const initialDelta = targetLufsI - initialStemLufs
          let lowGain = initialDelta - 10
          let highGain = initialDelta + 15
          bestDrive = initialDelta
          for (let iteration = 0; iteration < 25; iteration += 1) {
            const midGain = (lowGain + highGain) / 2
            const rendered = await renderWithDrive(stemBuffers, midGain)
            const [left, right] = stereoChannels(rendered)
            const currentLufs = measureLufsI(left, right, sampleRate)
            if (Math.abs(currentLufs - targetLufsI) < tolerance) {
              bestDrive = midGain
              break
            }
            if (currentLufs < targetLufsI) lowGain = midGain
            else highGain = midGain
            bestDrive = midGain
          }
        }
        const finalMixRaw = await renderWithDrive(stemBuffers, bestDrive)
        const aligned = alignAndTrim(masterBuffer, finalMixRaw, sampleRate)
        await decodeContext.close()
        return {
          bestDrive,
          sampleLag: aligned.lag,
          left: aligned.left,
          right: aligned.right,
        }
      },
      {
        masterUrl,
        stemUrls,
        sampleRate,
        tolerance,
        targetLufsI,
        limiterParams: LIMITER_PARAMS,
        fixedDriveDb,
      }
    )
  } finally {
    await browser.close()
  }
}

async function main() {
  const masterPath = getArg('master')
  const stemsDir = getArg('stems', 'stems')
  const tolerance = Number(getArg('tol', '0.1'))
  const outPath = getArg('out', 'metadata.json')
  const outAudioPath = getArg('out_audio', 'mixed_limited_stems.mp3')
  const fixedDriveDbArg = getArg('fixed_drive_db')
  const fixedDriveDb = fixedDriveDbArg == null ? null : Number(fixedDriveDbArg)

  if (!masterPath) throw new Error('Missing required --master argument')
  if (!fs.existsSync(masterPath)) throw new Error(`Master file not found: ${masterPath}`)
  if (!fs.existsSync(stemsDir)) throw new Error(`Stems directory not found: ${stemsDir}`)

  const stemFiles = listStemFiles(stemsDir)
  if (stemFiles.length === 0) {
    throw new Error(`No .wav or .mp3 stem files found in ${stemsDir}`)
  }

  console.log(`Loading Master: ${masterPath}`)
  const masterSampleRate = getFfprobeSampleRate(masterPath)
  const masterStats = getFfmpegLoudness(masterPath)
  console.log(`Master Stats: ${masterStats.lufs_i} LUFS-I at ${masterSampleRate} Hz`)
  console.log(`Loading Stems from: ${stemsDir}`)
  console.log(`Optimizing Limiter Drive (Target: ${masterStats.lufs_i} LUFS)...`)

  const routes = new Map()
  routes.set('/master', path.resolve(masterPath))
  stemFiles.forEach((filePath, index) => {
    routes.set(`/stems/${index}`, path.resolve(filePath))
  })

  const server = await startFileServer(routes)
  const tempAlignedWav = path.join(os.tmpdir(), `frisches-limited-${Date.now()}.wav`)

  try {
    const renderResult = await renderLimitedMix({
      masterUrl: `${server.baseUrl}/master`,
      stemUrls: stemFiles.map((_, index) => `${server.baseUrl}/stems/${index}`),
      sampleRate: masterSampleRate,
      tolerance,
      targetLufsI: masterStats.lufs_i,
      fixedDriveDb,
    })

    console.log(
      `${fixedDriveDb == null ? 'Optimal' : 'Fixed'} Drive: ${renderResult.bestDrive >= 0 ? '+' : ''}${renderResult.bestDrive.toFixed(2)} dB. Aligning signals...`
    )

    writeFloatStereoWav(tempAlignedWav, renderResult.left, renderResult.right, masterSampleRate)
    const mixStats = getFfmpegLoudness(tempAlignedWav)
    const lagMs = (renderResult.sampleLag / masterSampleRate) * 1000

    if (outAudioPath) {
      console.log(`Exporting to: ${outAudioPath} at ${masterSampleRate}Hz`)
      const ffmpegArgs = ['-y', '-i', tempAlignedWav, '-ar', String(masterSampleRate)]
      if (outAudioPath.toLowerCase().endsWith('.mp3')) {
        ffmpegArgs.push('-b:a', '320k')
      }
      ffmpegArgs.push(outAudioPath)
      run('ffmpeg', ffmpegArgs)
    }

    const outputData = {
      alignment: {
        master_sample_rate_hz: masterSampleRate,
        offset_samples_applied: Number(renderResult.sampleLag),
        offset_ms_applied: round2(lagMs),
        status: 'aligned_and_length_matched',
      },
      limiter_settings: {
        python_pedalboard: {
          input_drive_db: round2(renderResult.bestDrive),
          ceiling_db: LIMITER_PARAMS.threshold,
          release_ms: LIMITER_PARAMS.releaseMs,
        },
      },
      metrics: {
        master: masterStats,
        mix: mixStats,
        deltas: {
          lufs_i: round2(mixStats.lufs_i - masterStats.lufs_i),
          lra: round2(mixStats.lra - masterStats.lra),
        },
      },
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, `${JSON.stringify(outputData, null, 4)}\n`)
    console.log(`Done. JSON saved to ${outPath}`)
  } finally {
    if (fs.existsSync(tempAlignedWav)) fs.unlinkSync(tempAlignedWav)
    await server.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
