#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const shouldVerify = process.argv.includes('--verify')
const MASTER_FILE_EXTENSIONS = ['.mp3', '.wav']

function getArg(name, fallback) {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  if (!match) return fallback
  return match.slice(prefix.length)
}

function resolveFromRoot(inputPath) {
  return path.resolve(ROOT, inputPath)
}

const AUDIO_ROOT = resolveFromRoot(
  getArg('audio-root', 'src/assets/private/audio/TalesFromTheCellar')
)
const STEMS_ROOT = resolveFromRoot(getArg('stems-root', path.join(AUDIO_ROOT, 'stems')))
const OUTPUT_ROOT = resolveFromRoot(getArg('output-root', 'artifacts/limiter-metadata'))
const VERSIONED_METADATA_ROOT = resolveFromRoot(
  getArg('versioned-root', 'src/assets/metadata/limiter/tftc')
)

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`.trim())
  }

  return result.stdout
}

function relativeToRoot(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

function findMasterPath(audioRoot, label) {
  for (const extension of MASTER_FILE_EXTENSIONS) {
    const candidate = path.join(audioRoot, `${label} - Mastered${extension}`)
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

function stemDirectoryHasAudioFiles(stemDir) {
  return fs
    .readdirSync(stemDir, { withFileTypes: true })
    .some((entry) => entry.isFile() && /\.(mp3|wav)$/i.test(entry.name))
}

function main() {
  if (!fs.existsSync(STEMS_ROOT)) {
    throw new Error(`Stems root not found: ${STEMS_ROOT}`)
  }

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true })
  fs.mkdirSync(VERSIONED_METADATA_ROOT, { recursive: true })

  const jobs = fs
    .readdirSync(STEMS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !/backup/i.test(entry.name))
    .map((entry) => {
      const stemDir = path.join(STEMS_ROOT, entry.name)
      if (!stemDirectoryHasAudioFiles(stemDir)) {
        console.warn(
          `Skipping ${entry.name}: no .mp3 or .wav files found in ${relativeToRoot(stemDir)}`
        )
        return null
      }

      const masterPath = findMasterPath(AUDIO_ROOT, entry.name)
      if (!masterPath) {
        console.warn(
          `Skipping ${entry.name}: no matching mastered file found in ${relativeToRoot(AUDIO_ROOT)}`
        )
        return null
      }

      const slug = slugify(entry.name)
      return {
        label: entry.name,
        masterPath,
        stemDir,
        jsonOut: path.join(VERSIONED_METADATA_ROOT, `${slug}.json`),
        mixOut: path.join(OUTPUT_ROOT, `${slug}-mix.wav`),
        verificationOut: path.join(OUTPUT_ROOT, `${slug}-verification.json`),
      }
    })
    .filter(Boolean)

  if (jobs.length === 0) {
    throw new Error(
      `No valid stem/master pairs found under ${STEMS_ROOT}. Expected <stem dir> plus a matching <stem dir> - Mastered.(mp3|wav) file under ${AUDIO_ROOT}.`
    )
  }

  for (const job of jobs) {
    console.log(`Generating limiter metadata for ${job.label}...`)
    const metadataStdout = run('node', [
      'scripts/limiter-metadata.js',
      `--master=${relativeToRoot(job.masterPath)}`,
      `--stems=${relativeToRoot(job.stemDir)}`,
      `--out=${relativeToRoot(job.jsonOut)}`,
      `--out_audio=${relativeToRoot(job.mixOut)}`,
    ])
    if (metadataStdout.trim()) {
      console.log(metadataStdout.trim())
    }

    if (shouldVerify) {
      console.log(`Verifying generated mix for ${job.label}...`)
      const verificationStdout = run('python', [
        'scripts/stems_verification.py',
        `--master=${relativeToRoot(job.masterPath)}`,
        `--mix=${relativeToRoot(job.mixOut)}`,
      ])
      fs.writeFileSync(job.verificationOut, verificationStdout)
      console.log(verificationStdout.trim())
    }
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
