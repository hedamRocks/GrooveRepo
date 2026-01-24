/**
 * Add a track to a setlist
 * Tracks are added to the end of the setlist by default
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

    // Verify ownership
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
    const { trackId, manualBpm, notes } = body

    if (!trackId) {
      throw createError({
        statusCode: 400,
        message: 'Track ID required'
      })
    }

    // Verify track exists and belongs to user
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        userRecord: true
      }
    })

    if (!track || track.userRecord.userId !== user.id) {
      throw createError({
        statusCode: 404,
        message: 'Track not found'
      })
    }

    // Check if track is already in setlist
    const existing = await prisma.setlistTrack.findUnique({
      where: {
        setlistId_trackId: {
          setlistId,
          trackId
        }
      }
    })

    if (existing) {
      throw createError({
        statusCode: 400,
        message: 'Track already in setlist'
      })
    }

    // Get next sort order (add to end)
    const nextSortOrder = setlist.tracks.length > 0
      ? setlist.tracks[0].sortOrder + 1
      : 0

    const setlistTrack = await prisma.setlistTrack.create({
      data: {
        setlistId,
        trackId,
        sortOrder: nextSortOrder,
        manualBpm: manualBpm || null,
        notes: notes?.trim() || null
      }
    })

    console.log(`[Setlists] Added track ${trackId} to setlist ${setlistId}`)

    return {
      success: true,
      setlistTrack: {
        id: setlistTrack.id,
        sortOrder: setlistTrack.sortOrder,
        manualBpm: setlistTrack.manualBpm,
        notes: setlistTrack.notes,
      }
    }

  } catch (error) {
    console.error('[Setlists] Add track error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to add track to setlist'
    })
  }
})
