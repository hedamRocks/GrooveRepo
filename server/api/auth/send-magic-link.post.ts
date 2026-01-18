/**
 * Send magic link to user's email
 * Creates a time-limited token and sends email
 */

import { randomBytes } from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const email = body.email?.toLowerCase().trim()

    if (!email) {
      throw createError({
        statusCode: 400,
        message: 'Email required'
      })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid email format'
      })
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: { email }
      })
      console.log(`[Auth] Created new user: ${email}`)
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store token
    await prisma.magicLinkToken.create({
      data: {
        token,
        email,
        expiresAt,
        userId: user.id,
      }
    })

    // Send email
    await sendMagicLink(email, token)

    console.log(`[Auth] Magic link sent to ${email}`)

    return {
      success: true,
      message: 'Check your email for a sign-in link'
    }

  } catch (error) {
    console.error('[Auth] Send magic link error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to send magic link'
    })
  }
})
