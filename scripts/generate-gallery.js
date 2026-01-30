/**
 * generate-gallery.js
 * 
 * Reads a DigiKam SQLite database and generates a JSON metadata file
 * for the web gallery component.
 * 
 * Usage:
 *   node scripts/generate-gallery.js
 * 
 * Environment Variables:
 *   DIGIKAM_DB - Path to digikam4.db (defaults to src/assets/private/images/gallery/digikam4.db)
 * 
 * Note: Uses sql.js (pure JavaScript SQLite) to avoid native compilation dependencies
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import initSqlJs from 'sql.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Configuration
const DB_PATH = process.env.DIGIKAM_DB || join(rootDir, 'src/assets/private/images/gallery/digikam4.db')
const OUTPUT_PATH = join(rootDir, 'src/assets/gallery_data.json')
const GALLERY_BASE = join(rootDir, 'src/assets/private/images/gallery')

console.log('🖼️  Generating gallery metadata...')
console.log(`📂 Database: ${DB_PATH}`)
console.log(`📁 Gallery base: ${GALLERY_BASE}`)
console.log(`📄 Output: ${OUTPUT_PATH}`)

if (!existsSync(DB_PATH)) {
  console.error(`❌ Database not found at ${DB_PATH}`)
  console.error('   Set DIGIKAM_DB environment variable to specify a custom path.')
  process.exit(1)
}

try {
  // Initialize sql.js
  const SQL = await initSqlJs()
  const dbBuffer = readFileSync(DB_PATH)
  const db = new SQL.Database(dbBuffer)

  // ==================== STEP 1: Map Album IDs to relative paths ====================
  console.log('\n📚 Reading albums...')
  const albumsResult = db.exec(`
    SELECT id, relativePath
    FROM Albums
  `)
  
  const albumMap = {}
  if (albumsResult.length > 0) {
    const albumsData = albumsResult[0]
    const idIndex = albumsData.columns.indexOf('id')
    const pathIndex = albumsData.columns.indexOf('relativePath')
    
    albumsData.values.forEach(row => {
      const id = row[idIndex]
      const relativePath = row[pathIndex]
      // Clean up path: remove leading/trailing slashes and normalize
      const cleaned = relativePath.replace(/^\/+|\/+$/g, '').replace(/\\/g, '/')
      albumMap[id] = cleaned
    })
  }
  
  console.log(`   Found ${Object.keys(albumMap).length} albums`)

  // ==================== STEP 2: Build tag tree and classify tags ====================
  console.log('\n🏷️  Reading tags...')
  const tagsResult = db.exec(`
    SELECT id, pid, name
    FROM Tags
  `)
  
  const tagMap = {}
  const tagChildren = {}
  
  // Metadata tags to exclude (these are internal DigiKam labels, not user tags)
  const EXCLUDED_TAGS = new Set([
    'Color Label None',
    'Color Label Red',
    'Color Label Orange',
    'Color Label Yellow',
    'Color Label Green',
    'Color Label Blue',
    'Color Label Magenta',
    'Color Label Gray',
    'Pick Label None',
    'Pick Label Rejected',
    'Pick Label Pending',
    'Pick Label Accepted',
    'Scanned for Faces',
    '_Digikam_Internal_Tags_',
    '_Digikam_root_tag_'
  ])
  
  if (tagsResult.length > 0) {
    const tagsData = tagsResult[0]
    const idIndex = tagsData.columns.indexOf('id')
    const pidIndex = tagsData.columns.indexOf('pid')
    const nameIndex = tagsData.columns.indexOf('name')
    
    tagsData.values.forEach(row => {
      const id = row[idIndex]
      const pid = row[pidIndex]
      const name = row[nameIndex]
      
      // Skip excluded metadata tags
      if (EXCLUDED_TAGS.has(name)) return
      
      tagMap[id] = { id, pid, name }
      if (pid) {
        if (!tagChildren[pid]) tagChildren[pid] = []
        tagChildren[pid].push(id)
      }
    })
  }
  
  // Find root tags for "People" and "Location"
  let peopleRootId = null
  let locationRootId = null
  
  Object.values(tagMap).forEach(tag => {
    if (!tag.pid) {
      if (tag.name.toLowerCase() === 'people' || tag.name.toLowerCase() === 'persons') {
        peopleRootId = tag.id
      } else if (tag.name.toLowerCase() === 'location' || tag.name.toLowerCase() === 'locations') {
        locationRootId = tag.id
      }
    }
  })
  
  // Recursively collect all descendant tag IDs
  function getDescendants(tagId, collected = new Set()) {
    collected.add(tagId)
    const children = tagChildren[tagId] || []
    children.forEach(childId => getDescendants(childId, collected))
    return collected
  }

  // Build a path (segments) from an ancestor tag down to a tagId.
  // Returns [] if ancestor isn't in the chain.
  function getPathFromAncestor(ancestorId, tagId) {
    const segments = []
    let currentId = tagId
    while (currentId && currentId !== ancestorId) {
      const t = tagMap[currentId]
      if (!t) break
      segments.unshift(t.name)
      currentId = t.pid
    }
    return currentId === ancestorId ? segments : []
  }

  // Build a full path (segments) from the top-most parent down to a tagId.
  // Example: Activity/Show/Proberaum
  function getFullTagPath(tagId) {
    const segments = []
    let currentId = tagId
    while (currentId) {
      const t = tagMap[currentId]
      if (!t) break
      segments.unshift(t.name)
      currentId = t.pid
    }
    return segments
  }
  
  const peopleTagIds = peopleRootId ? getDescendants(peopleRootId) : new Set()
  const locationTagIds = locationRootId ? getDescendants(locationRootId) : new Set()
  
  console.log(`   Found ${Object.keys(tagMap).length} tags (People: ${peopleTagIds.size}, Location: ${locationTagIds.size})`)
  
  // ==================== STEP 3: Read images and build metadata ====================
  console.log('\n📸 Reading images...')
  const imagesResult = db.exec(`
    SELECT 
      i.id,
      i.name,
      i.album
    FROM Images i
    ORDER BY i.album, i.name
  `)
  
  const imagesMap = {}
  if (imagesResult.length > 0) {
    const imagesData = imagesResult[0]
    const idIndex = imagesData.columns.indexOf('id')
    const nameIndex = imagesData.columns.indexOf('name')
    const albumIndex = imagesData.columns.indexOf('album')
    
    imagesData.values.forEach(row => {
      const id = row[idIndex]
      imagesMap[id] = {
        id,
        name: row[nameIndex],
        album: row[albumIndex],
        rating: 0,
        creationDate: null
      }
    })
  }
  
  // Try to get image properties (rating, creationDate) separately
  try {
    const propsResult = db.exec(`
      SELECT imageid, property, value
      FROM ImageProperties
      WHERE property IN ('rating', 'creationDate')
    `)
    
    if (propsResult.length > 0) {
      const propsData = propsResult[0]
      const imageidIndex = propsData.columns.indexOf('imageid')
      const propertyIndex = propsData.columns.indexOf('property')
      const valueIndex = propsData.columns.indexOf('value')
      
      propsData.values.forEach(row => {
        const imageid = row[imageidIndex]
        const property = row[propertyIndex]
        const value = row[valueIndex]
        
        if (imagesMap[imageid]) {
          if (property === 'rating') {
            imagesMap[imageid].rating = parseInt(value) || 0
          } else if (property === 'creationDate') {
            imagesMap[imageid].creationDate = value
          }
        }
      })
    }
  } catch {
    console.warn('   Warning: Could not read ImageProperties table')
  }
  
  // Try to get creation dates from ImageInformation
  try {
    const infoResult = db.exec(`
      SELECT imageid, creationDate
      FROM ImageInformation
    `)
    
    if (infoResult.length > 0) {
      const infoData = infoResult[0]
      const imageidIndex = infoData.columns.indexOf('imageid')
      const dateIndex = infoData.columns.indexOf('creationDate')
      
      infoData.values.forEach(row => {
        const imageid = row[imageidIndex]
        const date = row[dateIndex]
        
        if (imagesMap[imageid] && !imagesMap[imageid].creationDate) {
          imagesMap[imageid].creationDate = date
        }
      })
    }
  } catch {
    console.warn('   Warning: Could not read ImageInformation table')
  }
  
  // Get GPS location data from ImagePositions
  const gpsLocationsMap = {}
  try {
    const gpsResult = db.exec(`
      SELECT imageid, latitude, longitude, description
      FROM ImagePositions
    `)
    
    if (gpsResult.length > 0) {
      const gpsData = gpsResult[0]
      const imageidIndex = gpsData.columns.indexOf('imageid')
      const latIndex = gpsData.columns.indexOf('latitude')
      const lngIndex = gpsData.columns.indexOf('longitude')
      const descIndex = gpsData.columns.indexOf('description')
      
      gpsData.values.forEach(row => {
        const imageid = row[imageidIndex]
        const lat = row[latIndex]
        const lng = row[lngIndex]
        const desc = row[descIndex]
        
        if (lat && lng) {
          gpsLocationsMap[imageid] = {
            latitude: lat,
            longitude: lng,
            description: desc || null
          }
        }
      })
    }
    console.log(`   Found GPS data for ${Object.keys(gpsLocationsMap).length} images`)
  } catch {
    console.warn('   Warning: Could not read GPS location data')
  }
  
  // Get image tags
  const imageTagsResult = db.exec(`
    SELECT imageid, tagid
    FROM ImageTags
  `)
  
  const imageTagsMap = {}
  if (imageTagsResult.length > 0) {
    const imageTagsData = imageTagsResult[0]
    const imageidIndex = imageTagsData.columns.indexOf('imageid')
    const tagidIndex = imageTagsData.columns.indexOf('tagid')
    
    imageTagsData.values.forEach(row => {
      const imageid = row[imageidIndex]
      const tagid = row[tagidIndex]
      
      if (!imageTagsMap[imageid]) imageTagsMap[imageid] = []
      imageTagsMap[imageid].push(tagid)
    })
  }
  
  // Build final gallery data
  const galleryData = []
  
  Object.values(imagesMap).forEach(image => {
    const albumPath = albumMap[image.album] || ''
    const relativePath = albumPath ? `${albumPath}/${image.name}` : image.name
    
    // Get tags for this image
    const tagIds = imageTagsMap[image.id] || []
    const tags = []
    const people = []
    const location = []
    
    tagIds.forEach(tagId => {
      const tag = tagMap[tagId]
      if (!tag) return
      
      if (peopleTagIds.has(tagId)) {
        // Don't include the People root node itself as a person
        if (tagId !== peopleRootId) {
          people.push(tag.name)
        }
      } else if (locationTagIds.has(tagId)) {
        if (tagId !== locationRootId) {
          const pathSegments = getPathFromAncestor(locationRootId, tagId)
          if (pathSegments.length) {
            location.push(pathSegments.join('/'))
          } else {
            // Fallback: at least keep leaf name
            location.push(tag.name)
          }
        }
      } else {
        // Skip root tags themselves in regular tags
        if (tagId !== peopleRootId && tagId !== locationRootId) {
          const pathSegments = getFullTagPath(tagId)
          if (pathSegments.length) {
            tags.push(pathSegments.join('/'))
          } else {
            tags.push(tag.name)
          }
        }
      }
    })
    
    galleryData.push({
      id: image.id,
      filename: image.name,
      relativePath: relativePath.replace(/\\/g, '/'),
      albumName: albumMap[image.album] || 'Uncategorized',
      tags: [...new Set(tags)].sort(),
      people: [...new Set(people)].sort(),
      location: [...new Set(location)].sort(),
      rating: image.rating,
      creationDate: image.creationDate
    })
  })
  
  db.close()
  
  // ==================== STEP 4: Write output ====================
  console.log(`\n💾 Writing ${galleryData.length} images to ${OUTPUT_PATH}...`)
  writeFileSync(OUTPUT_PATH, JSON.stringify(galleryData, null, 2), 'utf-8')
  
  // Statistics
  const albums = new Set(galleryData.map(img => img.albumName))
  const allPeople = new Set(galleryData.flatMap(img => img.people))
  const allLocations = new Set(galleryData.flatMap(img => img.location))
  const allTags = new Set(galleryData.flatMap(img => img.tags))
  
  console.log('\n✅ Gallery metadata generated successfully!')
  console.log(`   📸 Images: ${galleryData.length}`)
  console.log(`   📚 Albums: ${albums.size}`)
  console.log(`   👥 People: ${allPeople.size}`)
  console.log(`   📍 Locations: ${allLocations.size}`)
  console.log(`   🏷️  Tags: ${allTags.size}`)
  
} catch (error) {
  console.error('\n❌ Error generating gallery metadata:', error.message)
  console.error(error.stack)
  process.exit(1)
}