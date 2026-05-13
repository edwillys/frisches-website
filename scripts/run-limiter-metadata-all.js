#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const AUDIO_ROOT = path.join(ROOT, 'src/assets/private/audio/TalesFromTheCellar')
const STEMS_ROOT = path.join(AUDIO_ROOT, 'stems')
const OUTPUT_ROOT = path.join(ROOT, 'artifacts/limiter-metadata')
const VERSIONED_METADATA_ROOT = path.join(ROOT, 'src/assets/metadata/limiter/tftc')
const shouldVerify = process.argv.includes('--verify')

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

function main() {
  if (!fs.existsSync(STEMS_ROOT)) {
    throw new Error(`Stems root not found: ${STEMS_ROOT}`)
  }

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true })
  fs.mkdirSync(VERSIONED_METADATA_ROOT, { recursive: true })

  const jobs = fs
    .readdirSync(STEMS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const stemDir = path.join(STEMS_ROOT, entry.name)
      const masterPath = path.join(AUDIO_ROOT, `${entry.name} - Mastered.mp3`)
      if (!fs.existsSync(masterPath)) return null
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
    throw new Error(`No valid stem/master pairs found under ${STEMS_ROOT}`)
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
