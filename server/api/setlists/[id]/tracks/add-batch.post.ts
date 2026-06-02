/**
 * Add multiple tracks to a setlist in one request.
 * Tracks are appended to the end, in the order given. Tracks already in the
 * setlist (or not owned by the user) are skipped rather than erroring.
 */

export default defineEventHandler(async (event) => {
  try {
    const userEmail = getCookie(event, 'user_email')
    if (!userEmail) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required'
      })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'User not found'
      })
    }

    const setlistId = getRouterParam(event, 'id')
    if (!setlistId) {
      throw createError({
        statusCode: 400,
        message: 'Setlist ID required'
      })
    }

    // Verify ownership and get current max sort order
    const setlist = await prisma.setlist.findUnique({
      where: {
        id: setlistId,
        userId: user.id
      },
      include: {
        tracks: {
          orderBy: { sortOrder: 'desc' },
          take: 1
        }
      }
    })

    if (!setlist) {
      throw createError({
        statusCode: 404,
        message: 'Setlist not found'
      })
    }

    const body = await readBody(event)
    const trackIds: string[] = Array.isArray(body?.trackIds) ? body.trackIds : []

    if (trackIds.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'At least one track ID is required'
      })
    }

    // Keep only tracks that exist and belong to the user
    const ownedTracks = await prisma.track.findMany({
      where: {
        id: { in: trackIds },
        userRecord: { userId: user.id }
      },
      select: { id: true }
    })
    const ownedIds = new Set(ownedTracks.map((t) => t.id))

    // Skip tracks already present in this setlist
    const existing = await prisma.setlistTrack.findMany({
      where: { setlistId, trackId: { in: trackIds } },
      select: { trackId: true }
    })
    const existingIds = new Set(existing.map((t) => t.trackId))

    // Preserve the caller's ordering, drop unowned / duplicate entries
    const toAdd = trackIds.filter(
      (id) => ownedIds.has(id) && !existingIds.has(id)
    )

    let nextSortOrder = setlist.tracks.length > 0
      ? setlist.tracks[0].sortOrder + 1
      : 0

    if (toAdd.length > 0) {
      await prisma.setlistTrack.createMany({
        data: toAdd.map((trackId) => ({
          setlistId,
          trackId,
          sortOrder: nextSortOrder++
        })),
        skipDuplicates: true
      })
    }

    console.log(`[Setlists] Batch-added ${toAdd.length} track(s) to setlist ${setlistId}`)

    return {
      success: true,
      added: toAdd.length,
      skipped: trackIds.length - toAdd.length
    }

  } catch (error) {
    console.error('[Setlists] Batch add tracks error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to add tracks to setlist'
    })
  }
})
