/**
 * Search Discogs for releases (manual add feature)
 * Requires authenticated user with Discogs token
 */

export default defineEventHandler(async (event) => {
  try {
    // Get current user (replace with proper auth middleware)
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

    if (!user || !user.discogsToken) {
      throw createError({
        statusCode: 401,
        message: 'Discogs account not connected'
      })
    }

    // Get search query
    const query = getQuery(event)
    const searchQuery = query.q as string
    const page = parseInt(query.page as string) || 1

    if (!searchQuery || searchQuery.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Search query required'
      })
    }

    // Parse Discogs credentials
    const credentials = JSON.parse(user.discogsToken)
    const { token, secret } = credentials

    // Search Discogs
    const discogsClient = getDiscogsClient()
    const results = await discogsClient.searchReleases(
      searchQuery,
      token,
      secret,
      page,
      20
    )

    return results

  } catch (error) {
    console.error('[Discogs Search] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Search failed'
    })
  }
})
