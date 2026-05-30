/**
 * Start a resumable tracklist backfill — fetches full Discogs releases for
 * records imported with only basic_information.
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
    if (!user.discogsToken) {
      throw createError({ statusCode: 400, message: 'Discogs account not connected' })
    }

    // If a backfill is already running, return it instead of starting another.
    const existingJob = await prisma.tracklistJob.findFirst({
      where: { userId: user.id, status: { in: ['pending', 'in_progress'] } },
    })
    if (existingJob) {
      return {
        jobId: existingJob.id,
        status: existingJob.status,
        total: existingJob.totalItems,
        processed: existingJob.processedItems,
        message: 'Backfill already in progress',
      }
    }

    const missing = await countMissingTracklists(user.id)
    if (missing === 0) {
      return { jobId: null, total: 0, status: 'completed', message: 'All records already have tracklists' }
    }

    const job = await prisma.tracklistJob.create({
      data: { userId: user.id, status: 'pending', totalItems: missing },
    })

    const { token, secret } = JSON.parse(user.discogsToken)
    queueTracklistBackfill({ jobId: job.id, userId: user.id, token, secret })

    console.log(`[Backfill Start] Job ${job.id} for user ${user.id} (${missing} records)`)

    return { jobId: job.id, status: 'pending', total: missing, processed: 0, message: 'Backfill started' }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('[Backfill Start] Error:', error)
    throw createError({ statusCode: 500, message: 'Failed to start backfill' })
  }
})
