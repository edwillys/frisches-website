import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const srcDir = path.join(projectRoot, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco')
const destDir = path.join(projectRoot, 'public', 'draco')

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await exists(srcDir))) {
    console.warn(`[copy-draco] Source not found: ${srcDir}`)
    console.warn('[copy-draco] Skipping Draco copy; 3D model decoding may rely on external decoderPath.')
    return
  }

  await fs.mkdir(destDir, { recursive: true })

  // Copy everything (includes wasm/js + optional gltf helpers)
  await fs.cp(srcDir, destDir, {
    recursive: true,
    force: true,
  })

  console.log(`[copy-draco] Copied Draco decoders to ${destDir}`)
}

await main()
