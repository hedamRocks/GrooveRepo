/**
 * Add record to shelf
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

    // Verify record ownership
    const record = await prisma.userRecord.findUnique({
      where: { id: recordId }
    })

    if (!record || record.userId !== user.id) {
      throw createError({
        statusCode: 404,
        message: 'Record not found'
      })
    }

    // Check if already on shelf
    const existing = await prisma.shelfPlacement.findUnique({
      where: {
        userRecordId_shelfId: {
          userRecordId: recordId,
          shelfId: shelfId
        }
      }
    })

    if (existing) {
      throw createError({
        statusCode: 400,
        message: 'Record already on this shelf'
      })
    }

    // Add to shelf
    const placement = await prisma.shelfPlacement.create({
      data: {
        userRecordId: recordId,
        shelfId: shelfId,
      }
    })

    return { placement }

  } catch (error) {
    console.error('[Add to Shelf] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to add record to shelf'
    })
  }
})
