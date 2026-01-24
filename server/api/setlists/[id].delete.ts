/**
 * Delete a setlist
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

    const setlistId = getRouterParam(event, 'id')
    if (!setlistId) {
      throw createError({
        statusCode: 400,
        message: 'Setlist ID required'
      })
    }

    // Verify ownership
    const existing = await prisma.setlist.findUnique({
      where: {
        id: setlistId,
        userId: user.id
      }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Setlist not found'
      })
    }

    await prisma.setlist.delete({
      where: { id: setlistId }
    })

    console.log(`[Setlists] Deleted setlist: ${existing.name} (${setlistId})`)

    return {
      success: true
    }

  } catch (error) {
    console.error('[Setlists] Delete error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to delete setlist'
    })
  }
})
