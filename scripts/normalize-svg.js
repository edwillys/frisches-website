#!/usr/bin/env node
/**
 * normalize-svg.js
 *
 * Adapts SVG files so their path colors can be overridden by the website via CSS.
 * Concretely: replaces every hardcoded color value used as `fill` or `stroke`
 * (on elements AND inside <style> blocks) with `currentColor`, allowing the
 * parent element's CSS `color` property to control the icon appearance.
 *
 * Additionally cleans up common Adobe Illustrator / SVG-repo export noise:
 *   - Strips the XML declaration (<?xml …?>)
 *   - Removes <defs><style>…</style></defs> blocks that only contain
 *     presentation rules (fill/stroke/stroke-width) with no custom class logic
 *   - Removes root-SVG attributes that are irrelevant for inline use:
 *     id="Layer_1", xmlns:xlink, xml:space, version, px-sized width/height
 *
 * Usage:
 *   node scripts/normalize-svg.js                  # default: src/assets
 *   node scripts/normalize-svg.js src/assets/icons src/assets/badges
 *
 * The script is idempotent: already-normalized files are left untouched.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, extname } from 'node:path'

// ─── Color detection ──────────────────────────────────────────────────────────

/**
 * Returns true when `val` is a hardcoded color that should become `currentColor`.
 * Values that are intentionally colourless (`none`, `transparent`, `currentColor`)
 * are left unchanged.
 */
function isHardColor(val) {
  const v = val.trim().toLowerCase()
  if (!v || v === 'none' || v === 'transparent' || v === 'currentcolor') return false
  if (/^#[0-9a-f]{3,8}$/.test(v)) return true
  if (/^rgba?\(/.test(v) || /^hsla?\(/.test(v)) return true
  // Common named colors that tools export literally
  const named = new Set([
    'black', 'white', 'red', 'blue', 'green', 'gray', 'grey',
    'yellow', 'orange', 'purple', 'pink', 'cyan', 'magenta',
    'navy', 'teal', 'silver', 'maroon',
  ])
  return named.has(v)
}

function toCurrentColor(val) {
  return isHardColor(val) ? 'currentColor' : val
}

// ─── SVG normalization ────────────────────────────────────────────────────────

function normalizeSvg(content) {
  let s = content

  // 1. Strip XML declaration – not needed for inline SVG
  s = s.replace(/<\?xml[^>]*\?>\s*/gs, '')

  // 2. Normalize colors inside <style> blocks first (before potentially removing them)
  s = s.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_m, open, css, close) => {
    const normalized = css.replace(
      /(fill|stroke|color)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)/g,
      (_mc, prop, val) => `${prop}: ${toCurrentColor(val)}`,
    )
    return `${open}${normalized}${close}`
  })

  // 3. Remove <defs> blocks whose only content is a <style> block.
  //    Adobe Illustrator exports these with classes (.st0, etc.) that are typically
  //    never applied to the actual path elements, making them dead code.
  s = s.replace(/<defs>\s*<style>[\s\S]*?<\/style>\s*<\/defs>/g, '')

  // 4. Replace hardcoded fill/stroke attribute values on every element
  s = s.replace(/\b(fill|stroke)="([^"]*)"/g, (_m, attr, val) => `${attr}="${toCurrentColor(val)}"`)

  // 5. Clean up the root <svg> element's attributes
  s = s.replace(/(<svg\b)([^>]*)(>)/, (_m, open, attrs, close) => {
    let a = attrs
    // Remove fixed pixel dimensions – viewBox is sufficient for responsive SVGs
    a = a.replace(/\s+width="\d+(\.\d+)?px"/g, '')
    a = a.replace(/\s+height="\d+(\.\d+)?px"/g, '')
    // Remove Illustrator / tool artifacts
    a = a.replace(/\s+id="(?:Layer_1|Capa_1|[Ll]ayer_\d+)"/g, '')
    a = a.replace(/\s+xmlns:xlink="[^"]*"/g, '')
    a = a.replace(/\s+xml:space="[^"]*"/g, '')
    a = a.replace(/\s+version="[^"]*"/g, '')
    // Normalize internal whitespace
    a = a.replace(/\s+/g, ' ').trim()
    return `${open} ${a}${close}`
  })

  // 6. Remove remaining empty <defs/> or <defs></defs> tags
  s = s.replace(/<defs\s*\/>/g, '')
  s = s.replace(/<defs>\s*<\/defs>/g, '')

  return s.trim() + '\n'
}

// ─── File discovery ───────────────────────────────────────────────────────────

function findSvgFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findSvgFiles(full))
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.svg') {
      results.push(full)
    }
  }
  return results
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const dirs = process.argv.slice(2)
if (dirs.length === 0) dirs.push('src/assets')

const files = dirs.flatMap(findSvgFiles)
let changed = 0

for (const file of files) {
  const original = readFileSync(file, 'utf8')
  const normalized = normalizeSvg(original)
  if (normalized !== original) {
    writeFileSync(file, normalized, 'utf8')
    console.log(`  ✓  ${file}`)
    changed++
  }
}

console.log(`\nDone – ${changed} of ${files.length} file(s) updated.`)
