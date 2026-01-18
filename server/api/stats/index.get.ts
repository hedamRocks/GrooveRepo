/**
 * Get collection statistics
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

    // Total records
    const totalRecords = await prisma.userRecord.count({
      where: { userId: user.id }
    })

    // Get all records with release data for stats
    const records = await prisma.userRecord.findMany({
      where: { userId: user.id },
      include: {
        release: {
          select: {
            artist: true,
            label: true,
            year: true,
            genres: true,
          }
        }
      }
    })

    // Count by genre
    const genreCounts: Record<string, number> = {}
    records.forEach(record => {
      record.release.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1
      })
    })

    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([genre, count]) => ({ genre, count }))

    // Count by label
    const labelCounts: Record<string, number> = {}
    records.forEach(record => {
      const label = record.release.label
      if (label) {
        labelCounts[label] = (labelCounts[label] || 0) + 1
      }
    })

    const topLabels = Object.entries(labelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, count]) => ({ label, count }))

    // Count by artist
    const artistCounts: Record<string, number> = {}
    records.forEach(record => {
      const artist = record.release.artist
      if (artist) {
        artistCounts[artist] = (artistCounts[artist] || 0) + 1
      }
    })

    const topArtists = Object.entries(artistCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([artist, count]) => ({ artist, count }))

    // Count by decade
    const decadeCounts: Record<string, number> = {}
    records.forEach(record => {
      const year = record.release.year
      if (year) {
        const decade = `${Math.floor(year / 10) * 10}s`
        decadeCounts[decade] = (decadeCounts[decade] || 0) + 1
      }
    })

    const byDecade = Object.entries(decadeCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([decade, count]) => ({ decade, count }))

    // Total shelves
    const totalShelves = await prisma.shelf.count({
      where: { userId: user.id }
    })

    // Recent additions (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentAdditions = await prisma.userRecord.count({
      where: {
        userId: user.id,
        addedAt: { gte: sevenDaysAgo }
      }
    })

    return {
      stats: {
        totalRecords,
        totalShelves,
        recentAdditions,
        topGenres,
        topLabels,
        topArtists,
        byDecade,
      }
    }

  } catch (error) {
    console.error('[Stats] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch stats'
    })
  }
})
