/**
 * Initiate Discogs OAuth flow
 * Step 1: Get request token and redirect to Discogs
 */

export default defineEventHandler(async (event) => {
  try {
    const discogsClient = getDiscogsClient()

    // Get request token from Discogs
    const { token, secret, authorizeUrl } = await discogsClient.getRequestToken()

    // Store request token secret in session
    // We'll need it when user returns from Discogs
    setCookie(event, 'discogs_request_secret', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    // Redirect user to Discogs authorization page
    return sendRedirect(event, authorizeUrl)

  } catch (error) {
    console.error('[OAuth Start] Error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to initiate Discogs OAuth flow'
    })
  }
})
