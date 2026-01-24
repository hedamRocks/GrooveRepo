/**
 * Create a new setlist
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

    const body = await readBody(event)
    const { name, description, venue, date } = body

    if (!name || name.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Setlist name required'
      })
    }

    const setlist = await prisma.setlist.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        venue: venue?.trim() || null,
        date: date ? new Date(date) : null,
      }
    })

    console.log(`[Setlists] Created setlist: ${setlist.name} (${setlist.id})`)

    return {
      success: true,
      setlist: {
        id: setlist.id,
        name: setlist.name,
        description: setlist.description,
        venue: setlist.venue,
        date: setlist.date,
        createdAt: setlist.createdAt,
      }
    }

  } catch (error) {
    console.error('[Setlists] Create error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to create setlist'
    })
  }
})
