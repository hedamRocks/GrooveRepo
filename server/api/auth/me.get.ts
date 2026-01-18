/**
 * Get current authenticated user
 * Used for checking session status
 */

export default defineEventHandler(async (event) => {
  try {
    const userEmail = getCookie(event, 'user_email')

    if (!userEmail) {
      throw createError({
        statusCode: 401,
        message: 'Not authenticated'
      })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        discogsUsername: true,
        lastImportAt: true,
        lastImportStatus: true,
        createdAt: true,
      }
    })

    if (!user) {
      // Clear invalid session
      deleteCookie(event, 'user_email')
      deleteCookie(event, 'user_id')

      throw createError({
        statusCode: 401,
        message: 'User not found'
      })
    }

    return {
      user: {
        ...user,
        discogsConnected: !!user.discogsUsername,
      }
    }

  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error('[Auth] Get user error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to get user'
    })
  }
})
