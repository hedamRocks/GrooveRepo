/**
 * Remove a tag from a track
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

    const trackId = getRouterParam(event, 'id')
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

    const body = await readBody(event)
    const { tagId } = body

    if (!tagId) {
      throw createError({
        statusCode: 400,
        message: 'Tag ID required'
      })
    }

    // Find the track-tag association
    const trackTag = await prisma.trackTag.findUnique({
      where: {
        trackId_tagId: {
          trackId,
          tagId
        }
      },
      include: {
        tag: true
      }
    })

    if (!trackTag) {
      throw createError({
        statusCode: 404,
        message: 'Tag not assigned to track'
      })
    }

    // Verify tag belongs to user
    if (trackTag.tag.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Unauthorized'
      })
    }

    await prisma.trackTag.delete({
      where: { id: trackTag.id }
    })

    console.log(`[Tags] Removed tag ${trackTag.tag.name} from track ${trackId}`)

    return {
      success: true
    }

  } catch (error) {
    console.error('[Tags] Remove tag error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to remove tag'
    })
  }
})
