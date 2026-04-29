#!/usr/bin/env node
// Cross-platform rclone sync helper for private assets.
// Usage: node scripts/sync-r2.mjs <up|down|bisync>
import { execSync } from 'node:child_process'

const bucket = process.env.R2_BUCKET_NAME
if (!bucket) {
  console.error('Error: R2_BUCKET_NAME environment variable is not set.')
  console.error('Copy .env.example to .env.local and fill in the R2 credentials.')
  process.exit(1)
}

const direction = process.argv[2]
const filterFlag = '--filter-from ./src/assets/.rclone-filter -v'
const local = './src/assets/private'
const remote = `r2:${bucket}`

const commands = {
  up: `rclone copy ${local} ${remote} ${filterFlag}`,
  down: `rclone copy ${remote} ${local} ${filterFlag}`,
  bisync: `rclone bisync ${local} ${remote} ${filterFlag}`,
}

const cmd = commands[direction]
if (!cmd) {
  console.error(`Unknown direction "${String(direction)}". Use: up, down, or bisync.`)
  process.exit(1)
}

execSync(cmd, { stdio: 'inherit' })
