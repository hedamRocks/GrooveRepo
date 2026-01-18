/**
 * Get user's collection
 * Supports search and pagination
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

    // Build where clause for search
    const where: any = {
      userId: user.id
    }

    if (search.trim()) {
      where.release = {
        OR: [
          { artist: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { label: { contains: search, mode: 'insensitive' } },
        ]
      }
    }

    // Get total count
    const total = await prisma.userRecord.count({ where })

    // Get records
    const records = await prisma.userRecord.findMany({
      where,
      include: {
        release: {
          select: {
            id: true,
            discogsId: true,
            title: true,
            artist: true,
            label: true,
            catNo: true,
            year: true,
            genres: true,
            styles: true,
            coverUrl: true,
            thumbUrl: true,
          }
        },
        shelfPlacements: {
          include: {
            shelf: {
              select: {
                id: true,
                name: true,
                color: true,
              }
            }
          }
        }
      },
      orderBy: { addedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    }

  } catch (error) {
    console.error('[Records List] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch records'
    })
  }
})
