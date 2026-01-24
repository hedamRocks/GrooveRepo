/**
 * Reorder tracks in a setlist
 * Accepts array of track IDs in desired order
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
        tracks: true
      }
    })

    if (!setlist) {
      throw createError({
        statusCode: 404,
        message: 'Setlist not found'
      })
    }

    const body = await readBody(event)
    const { trackIds } = body

    if (!trackIds || !Array.isArray(trackIds)) {
      throw createError({
        statusCode: 400,
        message: 'Track IDs array required'
      })
    }

    // Verify all tracks belong to this setlist
    const setlistTrackIds = setlist.tracks.map(t => t.trackId)
    const allTracksValid = trackIds.every(id => setlistTrackIds.includes(id))

    if (!allTracksValid || trackIds.length !== setlistTrackIds.length) {
      throw createError({
        statusCode: 400,
        message: 'Invalid track IDs - must include all tracks exactly once'
      })
    }

    // Update sort order for each track
    await Promise.all(
      trackIds.map((trackId, index) =>
        prisma.setlistTrack.update({
          where: {
            setlistId_trackId: {
              setlistId,
              trackId
            }
          },
          data: {
            sortOrder: index
          }
        })
      )
    )

    console.log(`[Setlists] Reordered tracks in setlist ${setlistId}`)

    return {
      success: true
    }

  } catch (error) {
    console.error('[Setlists] Reorder tracks error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to reorder tracks'
    })
  }
})
