/**
 * Create new shelf
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

    const body = await readBody(event)
    const { name, description, color } = body

    if (!name || name.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Shelf name required'
      })
    }

    // Get current max sort order
    const maxShelf = await prisma.shelf.findFirst({
      where: { userId: user.id },
      orderBy: { sortOrder: 'desc' }
    })

    const sortOrder = maxShelf ? maxShelf.sortOrder + 1 : 0

    const shelf = await prisma.shelf.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        sortOrder,
        userId: user.id,
      },
      include: {
        _count: {
          select: { placements: true }
        }
      }
    })

    return { shelf }

  } catch (error) {
    console.error('[Shelf Create] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to create shelf'
    })
  }
})
