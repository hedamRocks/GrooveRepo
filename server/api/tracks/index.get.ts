/**
 * Get user's tracks from their collection
 * Supports search and pagination for adding to setlists
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

    const query = getQuery(event)
    const search = (query.search as string) || ''
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50

    // Build where clause
    const where: any = {
      userRecord: {
        userId: user.id
      }
    }

    // For search, we need to search both track title and release artist
    if (search.trim()) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        {
          userRecord: {
            release: {
              artist: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ]
    }

    // Get total count
    const total = await prisma.track.count({ where })

    // Get tracks with release info
    const tracks = await prisma.track.findMany({
      where,
      include: {
        userRecord: {
          include: {
            release: {
              select: {
                artist: true,
                title: true,
                thumbUrl: true,
              }
            }
          }
        },
        trackTags: {
          include: {
            tag: {
              select: {
                name: true,
                color: true,
              }
            }
          }
        }
      },
      orderBy: [
        { title: 'asc' }
      ],
      skip: (page - 1) * limit,
      take: limit,
    })

    // Add artist field from release to each track for easier access
    const tracksWithArtist = tracks.map(track => ({
      ...track,
      artist: track.userRecord?.release?.artist || 'Unknown Artist'
    }))

    return {
      tracks: tracksWithArtist,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    }

  } catch (error) {
    console.error('[Tracks List] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch tracks'
    })
  }
})
