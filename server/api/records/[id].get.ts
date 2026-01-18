/**
 * Get single record detail
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

    const recordId = getRouterParam(event, 'id')

    if (!recordId) {
      throw createError({
        statusCode: 400,
        message: 'Record ID required'
      })
    }

    const record = await prisma.userRecord.findUnique({
      where: { id: recordId },
      include: {
        release: true,
        shelfPlacements: {
          include: {
            shelf: true
          }
        }
      }
    })

    if (!record) {
      throw createError({
        statusCode: 404,
        message: 'Record not found'
      })
    }

    // Verify ownership
    if (record.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied'
      })
    }

    return { record }

  } catch (error) {
    console.error('[Record Detail] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch record'
    })
  }
})
