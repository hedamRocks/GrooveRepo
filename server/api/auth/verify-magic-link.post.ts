/**
 * Verify magic link token and create session
 * Called when user clicks email link
 */

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const token = body.token

    if (!token) {
      throw createError({
        statusCode: 400,
        message: 'Token required'
      })
    }

    // Find token
    const magicLinkToken = await prisma.magicLinkToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!magicLinkToken) {
      throw createError({
        statusCode: 401,
        message: 'Invalid or expired token'
      })
    }

    // Check if already used
    if (magicLinkToken.usedAt) {
      throw createError({
        statusCode: 401,
        message: 'Token already used'
      })
    }

    // Check if expired
    if (new Date() > magicLinkToken.expiresAt) {
      throw createError({
        statusCode: 401,
        message: 'Token expired'
      })
    }

    // Mark token as used
    await prisma.magicLinkToken.update({
      where: { id: magicLinkToken.id },
      data: { usedAt: new Date() }
    })

    // Create session (using simple cookie for now - replace with proper session management)
    setCookie(event, 'user_email', magicLinkToken.user.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    setCookie(event, 'user_id', magicLinkToken.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    console.log(`[Auth] User signed in: ${magicLinkToken.user.email}`)

    return {
      success: true,
      user: {
        id: magicLinkToken.user.id,
        email: magicLinkToken.user.email,
        discogsConnected: !!magicLinkToken.user.discogsToken,
      }
    }

  } catch (error) {
    console.error('[Auth] Verify magic link error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Authentication failed'
    })
  }
})
