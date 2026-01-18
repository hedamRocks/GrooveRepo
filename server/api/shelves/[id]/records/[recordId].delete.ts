/**
 * Remove record from shelf
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
    const recordId = getRouterParam(event, 'recordId')

    if (!shelfId || !recordId) {
      throw createError({
        statusCode: 400,
        message: 'Shelf ID and Record ID required'
      })
    }

    // Verify shelf ownership
    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId }
    })

    if (!shelf || shelf.userId !== user.id) {
      throw createError({
        statusCode: 404,
        message: 'Shelf not found'
      })
    }

    // Find and delete placement
    const placement = await prisma.shelfPlacement.findUnique({
      where: {
        userRecordId_shelfId: {
          userRecordId: recordId,
          shelfId: shelfId
        }
      }
    })

    if (!placement) {
      throw createError({
        statusCode: 404,
        message: 'Record not on this shelf'
      })
    }

    await prisma.shelfPlacement.delete({
      where: { id: placement.id }
    })

    return { success: true }

  } catch (error) {
    console.error('[Remove from Shelf] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to remove record from shelf'
    })
  }
})
