/**
 * Get all versions of a master release from Discogs
 * Allows users to see all pressings/versions when adding records
 */

export default defineEventHandler(async (event) => {
  try {
    // Get current user
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

    // Get master ID from query
    const query = getQuery(event)
    const masterId = parseInt(query.masterId as string)

    if (!masterId || isNaN(masterId)) {
      throw createError({
        statusCode: 400,
        message: 'Valid master ID required'
      })
    }

    // Parse Discogs credentials
    const credentials = JSON.parse(user.discogsToken)
    const { token, secret } = credentials

    // Fetch master versions from Discogs
    const discogsClient = getDiscogsClient()
    const versions = await discogsClient.getMasterVersions(
      masterId,
      token,
      secret,
      1,
      100 // Get up to 100 versions
    )

    return versions

  } catch (error) {
    console.error('[Discogs Master Versions] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch versions'
    })
  }
})
