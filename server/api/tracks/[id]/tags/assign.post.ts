/**
 * Assign a tag to a track
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

    // Verify tag exists and belongs to user
    const tag = await prisma.tag.findUnique({
      where: {
        id: tagId,
        userId: user.id
      }
    })

    if (!tag) {
      throw createError({
        statusCode: 404,
        message: 'Tag not found'
      })
    }

    // Check if already assigned
    const existing = await prisma.trackTag.findUnique({
      where: {
        trackId_tagId: {
          trackId,
          tagId
        }
      }
    })

    if (existing) {
      throw createError({
        statusCode: 400,
        message: 'Tag already assigned to track'
      })
    }

    const trackTag = await prisma.trackTag.create({
      data: {
        trackId,
        tagId
      }
    })

    console.log(`[Tags] Assigned tag ${tag.name} to track ${trackId}`)

    return {
      success: true,
      trackTag: {
        id: trackTag.id,
        tagId: trackTag.tagId,
        trackId: trackTag.trackId,
        addedAt: trackTag.addedAt
      }
    }

  } catch (error) {
    console.error('[Tags] Assign tag error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to assign tag'
    })
  }
})
