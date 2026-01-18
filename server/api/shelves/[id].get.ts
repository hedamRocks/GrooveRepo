/**
 * Get shelf with all records
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
        statusCode: 404,
        message: 'User not found'
      })
    }

    const shelfId = getRouterParam(event, 'id')

    if (!shelfId) {
      throw createError({
        statusCode: 400,
        message: 'Shelf ID required'
      })
    }

    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId },
      include: {
        placements: {
          include: {
            userRecord: {
              include: {
                release: {
                  select: {
                    id: true,
                    discogsId: true,
                    title: true,
                    artist: true,
                    label: true,
                    year: true,
                    coverUrl: true,
                    thumbUrl: true,
                  }
                }
              }
            }
          },
          orderBy: { addedAt: 'desc' }
        }
      }
    })

    if (!shelf) {
      throw createError({
        statusCode: 404,
        message: 'Shelf not found'
      })
    }

    // Verify ownership
    if (shelf.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied'
      })
    }

    return { shelf }

  } catch (error) {
    console.error('[Shelf Detail] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch shelf'
    })
  }
})
