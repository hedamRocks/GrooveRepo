/**
 * Extract tracks from Release.discogsData and create Track records
 * Run this script to populate tracks for all existing releases
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function extractTracks() {
  console.log('Starting track extraction...\n')

  try {
    // Get all releases with discogsData
    const releases = await prisma.release.findMany({
      where: {
        discogsData: { not: null }
      },
      include: {
        userRecords: true
      }
    })

    console.log(`Found ${releases.length} releases with Discogs data\n`)

    let totalTracks = 0
    let releasesWithTracks = 0
    let releasesWithoutTracks = 0

    for (const release of releases) {
      const discogsData = release.discogsData
      const tracklist = discogsData?.tracklist || []

      if (!Array.isArray(tracklist) || tracklist.length === 0) {
        releasesWithoutTracks++
        continue
      }

      // For each user that has this release, create tracks
      for (const userRecord of release.userRecords) {
        let trackPosition = 0

        for (const trackData of tracklist) {
          // Skip if it's a heading/section (e.g., "Side A")
          if (trackData.type_ === 'heading') {
            continue
          }

          try {
            const position = trackData.position || `${trackPosition + 1}`
            const trackId = `${userRecord.id}_${position}`

            // Create track
            await prisma.track.create({
              data: {
                id: trackId,
                userRecordId: userRecord.id,
                position: position,
                title: trackData.title || 'Unknown Title',
                duration: trackData.duration || null, // e.g., "5:30"
              }
            })

            trackPosition++
            totalTracks++
          } catch (error) {
            // Only log if it's not a duplicate key error
            if (!error.message.includes('Unique constraint')) {
              console.error(`Failed to create track for ${release.artist} - ${release.title}:`, error.message)
            }
          }
        }
      }

      releasesWithTracks++

      // Progress update every 50 releases
      if (releasesWithTracks % 50 === 0) {
        console.log(`Processed ${releasesWithTracks}/${releases.length} releases...`)
      }
    }

    console.log('\n✓ Track extraction complete!')
    console.log(`\nSummary:`)
    console.log(`- Releases with tracks: ${releasesWithTracks}`)
    console.log(`- Releases without tracks: ${releasesWithoutTracks}`)
    console.log(`- Total tracks created: ${totalTracks}`)

  } catch (error) {
    console.error('Error extracting tracks:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

extractTracks()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
