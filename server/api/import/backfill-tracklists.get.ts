/**
 * Tracklist backfill status: how many records still need tracklists, plus the
 * latest job (for the collection-page banner + progress polling).
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

    const [missing, job] = await Promise.all([
      countMissingTracklists(user.id),
      prisma.tracklistJob.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          totalItems: true,
          processedItems: true,
          failedItems: true,
        },
      }),
    ])

    return { missing, job }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('[Backfill Status] Error:', error)
    throw createError({ statusCode: 500, message: 'Failed to load backfill status' })
  }
})
