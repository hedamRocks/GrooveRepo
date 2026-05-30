/**
 * Email + password login.
 * Verifies the password against the stored scrypt hash and creates the same
 * cookie session that the magic-link verify flow uses.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const email = body.email?.toLowerCase().trim()
    const password = body.password

    if (!email || !password) {
      throw createError({ statusCode: 400, message: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Same generic message whether the user is missing or the password is wrong,
    // so we don't leak which emails have accounts.
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw createError({ statusCode: 401, message: 'Invalid email or password' })
    }

    setCookie(event, 'user_email', user.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    })
    setCookie(event, 'user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    })

    console.log(`[Auth] User logged in (password): ${user.email}`)

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        discogsConnected: !!user.discogsUsername,
      },
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('[Auth] Login error:', error)
    throw createError({ statusCode: 500, message: 'Login failed' })
  }
})
