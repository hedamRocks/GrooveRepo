/**
 * Discogs OAuth callback handler
 * Step 2: Exchange request token for access token
 */

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const requestToken = query.oauth_token as string
    const verifier = query.oauth_verifier as string

    if (!requestToken || !verifier) {
      throw createError({
        statusCode: 400,
        message: 'Missing OAuth parameters'
      })
    }

    // Get request secret from cookie
    const requestSecret = getCookie(event, 'discogs_request_secret')
    if (!requestSecret) {
      throw createError({
        statusCode: 400,
        message: 'OAuth session expired. Please try again.'
      })
    }

    // Clear the request secret cookie
    deleteCookie(event, 'discogs_request_secret')

    // Exchange for access token
    const discogsClient = getDiscogsClient()
    const { token: accessToken, secret: accessTokenSecret } =
      await discogsClient.getAccessToken(requestToken, requestSecret, verifier)

    // Get user's Discogs identity
    const identity = await discogsClient.getIdentity(accessToken, accessTokenSecret)

    // Get current user from session (assumes auth middleware has set this)
    // For now, we'll store in cookie - you'll replace with proper session management
    const userEmail = getCookie(event, 'user_email')

    if (!userEmail) {
      throw createError({
        statusCode: 401,
        message: 'User not authenticated. Please log in first.'
      })
    }

    // Update user with Discogs credentials
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // Store Discogs credentials
    // NOTE: In production, encrypt accessToken and accessTokenSecret
    await prisma.user.update({
      where: { id: user.id },
      data: {
        discogsUsername: identity.username,
        discogsToken: JSON.stringify({
          token: accessToken,
          secret: accessTokenSecret
        })
      }
    })

    console.log(`[OAuth Callback] Connected Discogs account for user ${user.id}`)

    // Redirect to import start page
    return sendRedirect(event, '/onboarding/import-progress')

  } catch (error) {
    console.error('[OAuth Callback] Error:', error)

    // Redirect to error page with message
    const errorMessage = error instanceof Error ? error.message : 'OAuth failed'
    return sendRedirect(event, `/auth/error?message=${encodeURIComponent(errorMessage)}`)
  }
})
