#!/usr/bin/env node
// Cross-platform rclone sync helper for private assets.
// Usage: node scripts/sync-r2.mjs <up|down|bisync> [--dry-run|-n]
import { execSync } from 'node:child_process'

// npm scripts don't automatically load .env files for plain node processes.
// Load project env files here so R2_* variables work consistently.
try {
  process.loadEnvFile('.env')
} catch {
  // Ignore missing/invalid file and continue.
}

try {
  process.loadEnvFile('.env.local')
} catch {
  // Ignore missing/invalid file and continue.
}

const bucket = process.env.R2_BUCKET_NAME
if (!bucket) {
  console.error('Error: R2_BUCKET_NAME environment variable is not set.')
  console.error('Copy .env.example to .env.local and fill in the R2 credentials.')
  process.exit(1)
}

const direction = process.argv[2]
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-n')
const filterFlag = '--filter-from ./src/assets/.rclone-filter'
const dryRunFlag = isDryRun ? '--dry-run' : ''
const verbosityFlag = '-v'
const local = './src/assets/private'
const remote = `r2:${bucket}`

const commands = {
  up: `rclone copy ${local} ${remote} ${filterFlag} ${dryRunFlag} ${verbosityFlag}`.trim(),
  down: `rclone copy ${remote} ${local} ${filterFlag} ${dryRunFlag} ${verbosityFlag}`.trim(),
  bisync: `rclone bisync ${local} ${remote} ${filterFlag} ${dryRunFlag} ${verbosityFlag}`.trim(),
}

const cmd = commands[direction]
if (!cmd) {
  console.error(`Unknown direction "${String(direction)}". Use: up, down, or bisync.`)
  process.exit(1)
}

execSync(cmd, { stdio: 'inherit' })
