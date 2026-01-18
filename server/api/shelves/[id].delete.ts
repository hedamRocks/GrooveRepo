/**
 * Delete shelf
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

    // Verify ownership
    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId }
    })

    if (!shelf) {
      throw createError({
        statusCode: 404,
        message: 'Shelf not found'
      })
    }

    if (shelf.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied'
      })
    }

    // Delete shelf (placements will cascade delete)
    await prisma.shelf.delete({
      where: { id: shelfId }
    })

    return { success: true }

  } catch (error) {
    console.error('[Shelf Delete] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to delete shelf'
    })
  }
})
