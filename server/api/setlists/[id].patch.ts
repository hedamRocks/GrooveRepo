/**
 * Update setlist metadata (name, description, venue, date)
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

    const body = await readBody(event)
    const { name, description, venue, date } = body

    const setlist = await prisma.setlist.update({
      where: { id: setlistId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(venue !== undefined && { venue: venue?.trim() || null }),
        ...(date !== undefined && { date: date ? new Date(date) : null }),
      }
    })

    console.log(`[Setlists] Updated setlist: ${setlist.name} (${setlist.id})`)

    return {
      success: true,
      setlist: {
        id: setlist.id,
        name: setlist.name,
        description: setlist.description,
        venue: setlist.venue,
        date: setlist.date,
        updatedAt: setlist.updatedAt,
      }
    }

  } catch (error) {
    console.error('[Setlists] Update error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to update setlist'
    })
  }
})
