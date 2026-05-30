/**
 * Get collection statistics.
 *
 * All aggregation runs in Postgres (GROUP BY, and unnest() for the genre
 * array) instead of loading the whole collection into Node and tallying with
 * forEach. Backed by the indexes on Release(year/label/genres) +
 * UserRecord(userId, addedAt). The response shape is unchanged.
 */

export default defineEventHandler(async (event) => {
  try {
    const userEmail = getCookie(event, 'user_email')
    if (!userEmail) {
      throw createError({ statusCode: 401, message: 'Authentication required' })
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }

    const userId = user.id

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Run every aggregation in parallel. COUNT(*) is cast to int so Prisma
    // returns a JS number (a raw bigint isn't JSON-serializable).
    const [
      totalRecords,
      totalShelves,
      recentAdditions,
      topGenres,
      topLabels,
      topArtists,
      decadeRows,
    ] = await Promise.all([
      prisma.userRecord.count({ where: { userId } }),
      prisma.shelf.count({ where: { userId } }),
      prisma.userRecord.count({ where: { userId, addedAt: { gte: sevenDaysAgo } } }),

      prisma.$queryRaw<Array<{ genre: string; count: number }>>`
        SELECT g AS genre, COUNT(*)::int AS count
        FROM "UserRecord" ur
        JOIN "Release" r ON r.id = ur."releaseId"
        CROSS JOIN LATERAL unnest(r.genres) AS g
        WHERE ur."userId" = ${userId} AND g IS NOT NULL AND g <> ''
        GROUP BY g
        ORDER BY count DESC, g ASC
        LIMIT 10
      `,

      prisma.$queryRaw<Array<{ label: string; count: number }>>`
        SELECT r.label AS label, COUNT(*)::int AS count
        FROM "UserRecord" ur
        JOIN "Release" r ON r.id = ur."releaseId"
        WHERE ur."userId" = ${userId} AND r.label IS NOT NULL AND r.label <> ''
        GROUP BY r.label
        ORDER BY count DESC, r.label ASC
        LIMIT 10
      `,

      prisma.$queryRaw<Array<{ artist: string; count: number }>>`
        SELECT r.artist AS artist, COUNT(*)::int AS count
        FROM "UserRecord" ur
        JOIN "Release" r ON r.id = ur."releaseId"
        WHERE ur."userId" = ${userId} AND r.artist IS NOT NULL AND r.artist <> ''
        GROUP BY r.artist
        ORDER BY count DESC, r.artist ASC
        LIMIT 10
      `,

      prisma.$queryRaw<Array<{ decade_start: number; count: number }>>`
        SELECT (FLOOR(r.year / 10) * 10)::int AS decade_start, COUNT(*)::int AS count
        FROM "UserRecord" ur
        JOIN "Release" r ON r.id = ur."releaseId"
        WHERE ur."userId" = ${userId} AND r.year IS NOT NULL
        GROUP BY decade_start
        ORDER BY decade_start ASC
      `,
    ])

    const byDecade = decadeRows.map((row) => ({
      decade: `${row.decade_start}s`,
      count: row.count,
    }))

    return {
      stats: {
        totalRecords,
        totalShelves,
        recentAdditions,
        topGenres,
        topLabels,
        topArtists,
        byDecade,
      },
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    console.error('[Stats] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch stats',
    })
  }
})
