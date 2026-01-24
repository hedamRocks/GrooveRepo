/**
 * Get all setlists for the current user
 * Returns basic setlist info with track count
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

    const setlists = await prisma.setlist.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { tracks: true }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return {
      setlists: setlists.map(setlist => ({
        id: setlist.id,
        name: setlist.name,
        description: setlist.description,
        venue: setlist.venue,
        date: setlist.date,
        duration: setlist.duration,
        _count: {
          tracks: setlist._count.tracks
        },
        createdAt: setlist.createdAt,
        updatedAt: setlist.updatedAt,
      }))
    }

  } catch (error) {
    console.error('[Setlists] Get setlists error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch setlists'
    })
  }
})
