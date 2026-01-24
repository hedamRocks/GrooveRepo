/**
 * Track Sync Utility
 * Populates Track records from Release.discogsData.tracklist
 */

export interface DiscogsTrack {
  position: string  // e.g. "A1", "A2", "B1"
  title: string
  duration: string  // e.g. "4:23"
  type_: string     // "track" | "heading"
}

/**
 * Sync tracks for a user record from its release's Discogs data
 */
export async function syncTracksForUserRecord(userRecordId: string): Promise<void> {
  const userRecord = await prisma.userRecord.findUnique({
    where: { id: userRecordId },
    include: { release: true }
  })

  if (!userRecord || !userRecord.release) {
    throw new Error('UserRecord or Release not found')
  }

  const discogsData = userRecord.release.discogsData as any

  if (!discogsData?.tracklist || !Array.isArray(discogsData.tracklist)) {
    console.log(`[Track Sync] No tracklist found for record ${userRecordId}`)
    return
  }

  const tracklist = discogsData.tracklist as DiscogsTrack[]

  // Filter out headings, keep only actual tracks
  const tracks = tracklist.filter(t =>
    t.type_ === 'track' &&
    t.position &&
    t.title
  )

  console.log(`[Track Sync] Syncing ${tracks.length} tracks for record ${userRecordId}`)

  // Upsert each track
  for (const track of tracks) {
    const trackId = `${userRecordId}_${track.position}`

    await prisma.track.upsert({
      where: { id: trackId },
      create: {
        id: trackId,
        userRecordId,
        position: track.position,
        title: track.title,
        duration: track.duration || null
      },
      update: {
        title: track.title,
        duration: track.duration || null
      }
    })
  }

  console.log(`[Track Sync] Synced ${tracks.length} tracks`)
}

/**
 * Sync tracks for all user records (batch operation)
 */
export async function syncAllTracks(userId?: string): Promise<{ synced: number, failed: number }> {
  const where = userId ? { userId } : {}

  const userRecords = await prisma.userRecord.findMany({
    where,
    include: { release: true }
  })

  console.log(`[Track Sync] Syncing tracks for ${userRecords.length} records`)

  let synced = 0
  let failed = 0

  for (const record of userRecords) {
    try {
      await syncTracksForUserRecord(record.id)
      synced++
    } catch (error) {
      console.error(`[Track Sync] Failed to sync ${record.id}:`, error)
      failed++
    }
  }

  console.log(`[Track Sync] Complete: ${synced} synced, ${failed} failed`)
  return { synced, failed }
}
