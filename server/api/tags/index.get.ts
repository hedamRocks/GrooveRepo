/**
 * Get all tags for the current user
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

    const tags = await prisma.tag.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { trackTags: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return {
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        trackCount: tag._count.trackTags,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      }))
    }

  } catch (error) {
    console.error('[Tags] Get tags error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch tags'
    })
  }
})
