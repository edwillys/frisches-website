/*
    This script compares two GLB files for logical equivalence,
    accounting for possible differences due to compression, quantization,
    or node ordering.
    Usage: node compare-glb.js <file1.glb> <file2.glb>
*/

import { NodeIO } from '@gltf-transform/core'
import {
  KHRDracoMeshCompression,
  KHRMeshQuantization,
  EXTMeshoptCompression,
  EXTTextureWebP,
} from '@gltf-transform/extensions'
import { prune, dedup } from '@gltf-transform/functions'
import draco3d from 'draco3d'
import sharp from 'sharp' // <--- REQUIRED for reading WebP dimensions

// --- CONFIGURATION ---
const FILE_A = process.argv[2]
const FILE_B = process.argv[3]

// Tolerances
const POS_TOLERANCE = 0.02
const AREA_TOLERANCE = 0.05
const VERTEX_TOLERANCE = 0.25
const TEXTURE_SIZE_TOLERANCE = 0.5

if (!FILE_A || !FILE_B) {
  console.error('Usage: node compare-glb.js <file1.glb> <file2.glb>')
  process.exit(1)
}

async function main() {
  const io = new NodeIO()
    .registerExtensions([
      KHRDracoMeshCompression,
      KHRMeshQuantization,
      EXTMeshoptCompression,
      EXTTextureWebP,
    ])
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      sharp: sharp, // <--- KEY FIX: Registers image processor
    })

  console.log(`Loading ${FILE_A}...`)
  const docA = await io.read(FILE_A)
  console.log(`Loading ${FILE_B}...`)
  const docB = await io.read(FILE_B)

  console.log('Normalizing (Pruning/Deduping) in memory...')
  await docA.transform(prune(), dedup())
  await docB.transform(prune(), dedup())

  const rootA = docA.getRoot()
  const rootB = docB.getRoot()
  const sceneA = rootA.getDefaultScene() || rootA.listScenes()[0]
  const sceneB = rootB.getDefaultScene() || rootB.listScenes()[0]

  const stats = {
    matches: 0,
    simplified_geo: 0,
    simplified_tex: 0,
    converted_tex: 0, // Track format conversions (jpg->webp)
    mismatches: 0,
  }

  console.log(`Comparing Scene...`)
  compareNodes(sceneA, sceneB, stats)

  console.log('---------------------------------------------------')
  if (stats.mismatches > 0) {
    console.error(`❌ FAILURE: Found ${stats.mismatches} mismatching parts.`)
    process.exit(1)
  }

  // Check for ANY optimization (Geo, Size, or Format)
  if (stats.simplified_geo > 0 || stats.simplified_tex > 0 || stats.converted_tex > 0) {
    console.log(`⚠️  PARTIAL SUCCESS: Objects match logically, but optimization was detected:`)
    if (stats.simplified_geo > 0)
      console.log(`   - ${stats.simplified_geo} Meshes were Simplified (Low Poly)`)
    if (stats.simplified_tex > 0)
      console.log(`   - ${stats.simplified_tex} Textures were Downscaled`)
    if (stats.converted_tex > 0)
      console.log(`   - ${stats.converted_tex} Textures were Converted (e.g. to WebP)`)
  } else {
    console.log(`✅ SUCCESS: Files are effectively identical.`)
  }
}

function compareNodes(nodeA, nodeB, stats) {
  const meshA = nodeA.getMesh ? nodeA.getMesh() : null
  const meshB = nodeB.getMesh ? nodeB.getMesh() : null

  if (meshA && meshB) {
    compareMeshes(meshA, meshB, stats)
  } else if (!!meshA !== !!meshB) {
    console.error(`Structure mismatch: Node '${nodeA.getName()}' mesh presence mismatch.`)
    stats.mismatches++
  }

  const childrenA = nodeA.listChildren()
  const childrenB = nodeB.listChildren()

  childrenA.sort((a, b) => a.getName().localeCompare(b.getName()))
  childrenB.sort((a, b) => a.getName().localeCompare(b.getName()))

  if (childrenA.length !== childrenB.length) {
    console.error(
      `Child count mismatch at '${nodeA.getName()}': ${childrenA.length} vs ${childrenB.length}`
    )
    stats.mismatches++
    return
  }

  for (let i = 0; i < childrenA.length; i++) {
    compareNodes(childrenA[i], childrenB[i], stats)
  }
}

function compareMeshes(meshA, meshB, stats) {
  const primitivesA = meshA.listPrimitives()
  const primitivesB = meshB.listPrimitives()
  const availableB = new Set(primitivesB)

  for (let i = 0; i < primitivesA.length; i++) {
    const primA = primitivesA[i]
    let bestMatch = null
    let bestScore = Infinity

    for (const primB of availableB) {
      const score = getGeometrySimilarityScore(primA, primB)
      if (score !== null && score < bestScore) {
        bestScore = score
        bestMatch = primB
      }
    }

    if (bestMatch && bestScore < AREA_TOLERANCE) {
      availableB.delete(bestMatch)

      // 1. Check Geometry Simplification
      const countA = primA.getAttribute('POSITION').getCount()
      const countB = bestMatch.getAttribute('POSITION').getCount()
      const ratio = countB / countA
      const diffPercent = Math.abs(1 - ratio)

      if (diffPercent > VERTEX_TOLERANCE) {
        console.warn(
          `   ⚠️ Mesh '${meshA.getName()}' [${i}]: Geometry Simplified (${countA}->${countB} verts).`
        )
        stats.simplified_geo++
      } else {
        stats.matches++
      }

      // 2. Check Texture Consistency
      compareMaterials(primA.getMaterial(), bestMatch.getMaterial(), stats, meshA.getName())
    } else {
      console.error(`   ❌ Mesh '${meshA.getName()}' [${i}]: No matching geometry found.`)
      stats.mismatches++
    }
  }
}

function compareMaterials(matA, matB, stats, meshName) {
  if (!matA || !matB) return

  const textureSlots = [
    'baseColorTexture',
    'metallicRoughnessTexture',
    'normalTexture',
    'occlusionTexture',
    'emissiveTexture',
  ]

  for (const slot of textureSlots) {
    const texA = matA[slot] ? matA[slot]() : null
    const texB = matB[slot] ? matB[slot]() : null

    if (!!texA !== !!texB) {
      console.error(`   ❌ Material mismatch on '${meshName}': Slot '${slot}' missing in one file.`)
      stats.mismatches++
      continue
    }

    if (texA && texB) {
      // Check Format (MimeType)
      if (texA.getMimeType() !== texB.getMimeType()) {
        console.warn(
          `      ⚠️ Texture '${slot}' format changed: ${texA.getMimeType()} -> ${texB.getMimeType()}`
        )
        stats.converted_tex++
      }

      // Check Resolution
      const sizeA = texA.getSize()
      const sizeB = texB.getSize()

      if (sizeA && sizeB) {
        const areaA = sizeA[0] * sizeA[1]
        const areaB = sizeB[0] * sizeB[1]

        if (areaA > 0) {
          const ratio = areaB / areaA
          if (ratio < TEXTURE_SIZE_TOLERANCE) {
            console.warn(
              `      ⚠️ Texture '${slot}' downscaled: ${sizeA.join('x')} -> ${sizeB.join('x')}`
            )
            stats.simplified_tex++
          }
        }
      } else {
        // If sizes are missing even after adding sharp, warn slightly.
        // console.warn(`      ℹ️ Could not read dimensions for texture '${slot}'.`);
      }
    }
  }
}

function getGeometrySimilarityScore(primA, primB) {
  const matA = primA.getMaterial()
  const matB = primB.getMaterial()
  if ((matA ? matA.getName() : 'null') !== (matB ? matB.getName() : 'null')) return null

  const posA = primA.getAttribute('POSITION')
  const posB = primB.getAttribute('POSITION')
  if (!posA || !posB) return null

  const bA = getBounds(posA)
  const bB = getBounds(posB)
  const cA = getCenter(bA)
  const cB = getCenter(bB)
  const dist = Math.hypot(cA[0] - cB[0], cA[1] - cB[1], cA[2] - cB[2])
  if (dist > POS_TOLERANCE) return null

  const areaA = calculateSurfaceArea(primA)
  const areaB = calculateSurfaceArea(primB)
  const diff = Math.abs(areaA - areaB)
  const avg = (areaA + areaB) / 2
  const ratio = avg === 0 ? 0 : diff / avg

  if (ratio > AREA_TOLERANCE) return null

  return ratio
}

function calculateSurfaceArea(prim) {
  const pos = prim.getAttribute('POSITION')
  const indices = prim.getIndices()
  if (!pos) return 0
  let area = 0
  const p1 = [],
    p2 = [],
    p3 = []
  const count = indices ? indices.getCount() : pos.getCount()
  const getIdx = indices ? (i) => indices.getScalar(i) : (i) => i
  for (let i = 0; i < count; i += 3) {
    pos.getElement(getIdx(i), p1)
    pos.getElement(getIdx(i + 1), p2)
    pos.getElement(getIdx(i + 2), p3)
    const ab = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]]
    const ac = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]]
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ]
    area += 0.5 * Math.hypot(cross[0], cross[1], cross[2])
  }
  return area
}
function getBounds(acc) {
  return { min: acc.getMin([]), max: acc.getMax([]) }
}
function getCenter(b) {
  return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]
}

main().catch((err) => {
  console.error('❌ CRITICAL ERROR:', err.message)
  process.exit(1)
})
