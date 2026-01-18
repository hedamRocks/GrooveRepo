/**
 * Start Discogs collection import
 * Creates ImportJob and queues background worker
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

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    if (!user.discogsToken || !user.discogsUsername) {
      throw createError({
        statusCode: 400,
        message: 'Discogs account not connected'
      })
    }

    // Check if there's already an active import
    const existingJob = await prisma.importJob.findFirst({
      where: {
        userId: user.id,
        status: { in: ['pending', 'in_progress'] }
      }
    })

    if (existingJob) {
      // Return existing job instead of creating new one
      return {
        jobId: existingJob.id,
        status: existingJob.status,
        message: 'Import already in progress'
      }
    }

    // Create new import job
    const importJob = await prisma.importJob.create({
      data: {
        userId: user.id,
        type: 'discogs_collection_full',
        status: 'pending',
      }
    })

    // Parse Discogs credentials
    const credentials = JSON.parse(user.discogsToken)
    const { token: accessToken, secret: accessTokenSecret } = credentials

    // Queue import worker
    queueDiscogsImport({
      jobId: importJob.id,
      userId: user.id,
      accessToken,
      accessTokenSecret,
      username: user.discogsUsername,
    })

    console.log(`[Import Start] Created job ${importJob.id} for user ${user.id}`)

    return {
      jobId: importJob.id,
      status: 'pending',
      message: 'Import started'
    }

  } catch (error) {
    console.error('[Import Start] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to start import'
    })
  }
})
