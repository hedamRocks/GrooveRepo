/**
 * Delete a tag
 * Also removes all TrackTag associations
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

    const tagId = getRouterParam(event, 'id')
    if (!tagId) {
      throw createError({
        statusCode: 400,
        message: 'Tag ID required'
      })
    }

    // Verify ownership
    const existing = await prisma.tag.findUnique({
      where: {
        id: tagId,
        userId: user.id
      }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Tag not found'
      })
    }

    await prisma.tag.delete({
      where: { id: tagId }
    })

    console.log(`[Tags] Deleted tag: ${existing.name} (${tagId})`)

    return {
      success: true
    }

  } catch (error) {
    console.error('[Tags] Delete error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to delete tag'
    })
  }
})
