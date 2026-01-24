/**
 * Remove a track from a setlist
 * Automatically reorders remaining tracks
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
      }
    })

    if (!setlist) {
      throw createError({
        statusCode: 404,
        message: 'Setlist not found'
      })
    }

    const body = await readBody(event)
    const { trackId } = body

    if (!trackId) {
      throw createError({
        statusCode: 400,
        message: 'Track ID required'
      })
    }

    // Find the setlist track entry
    const setlistTrack = await prisma.setlistTrack.findUnique({
      where: {
        setlistId_trackId: {
          setlistId,
          trackId
        }
      }
    })

    if (!setlistTrack) {
      throw createError({
        statusCode: 404,
        message: 'Track not in setlist'
      })
    }

    const removedSortOrder = setlistTrack.sortOrder

    // Delete the track
    await prisma.setlistTrack.delete({
      where: { id: setlistTrack.id }
    })

    // Reorder remaining tracks (decrease sortOrder for all tracks after the removed one)
    await prisma.setlistTrack.updateMany({
      where: {
        setlistId,
        sortOrder: { gt: removedSortOrder }
      },
      data: {
        sortOrder: { decrement: 1 }
      }
    })

    console.log(`[Setlists] Removed track ${trackId} from setlist ${setlistId}`)

    return {
      success: true
    }

  } catch (error) {
    console.error('[Setlists] Remove track error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to remove track from setlist'
    })
  }
})
