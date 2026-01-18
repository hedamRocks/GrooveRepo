/**
 * Update shelf (name, description, color)
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
    const existingShelf = await prisma.shelf.findUnique({
      where: { id: shelfId }
    })

    if (!existingShelf) {
      throw createError({
        statusCode: 404,
        message: 'Shelf not found'
      })
    }

    if (existingShelf.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied'
      })
    }

    const body = await readBody(event)

    // Build update data
    const updateData: any = {}
    if ('name' in body && body.name.trim().length > 0) {
      updateData.name = body.name.trim()
    }
    if ('description' in body) {
      updateData.description = body.description?.trim() || null
    }
    if ('color' in body) {
      updateData.color = body.color || null
    }

    const updatedShelf = await prisma.shelf.update({
      where: { id: shelfId },
      data: updateData,
      include: {
        _count: {
          select: { placements: true }
        }
      }
    })

    return { shelf: updatedShelf }

  } catch (error) {
    console.error('[Shelf Update] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to update shelf'
    })
  }
})
