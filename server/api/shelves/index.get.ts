/**
 * Get user's shelves
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

    const shelves = await prisma.shelf.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { placements: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return { shelves }

  } catch (error) {
    console.error('[Shelves List] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch shelves'
    })
  }
})
