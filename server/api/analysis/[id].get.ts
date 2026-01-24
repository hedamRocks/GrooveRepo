/**
 * Get analysis job status
 * Returns progress and results
 */

export default defineEventHandler(async (event) => {
  try {
    const jobId = getRouterParam(event, 'id')

    if (!jobId) {
      throw createError({
        statusCode: 400,
        message: 'Job ID required'
      })
    }

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

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // Fetch job
    const job = await prisma.analysisJob.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      throw createError({
        statusCode: 404,
        message: 'Job not found'
      })
    }

    // Verify ownership
    if (job.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Not authorized'
      })
    }

    // Calculate progress percentage
    const progress = job.totalTracks > 0
      ? Math.round((job.processed / job.totalTracks) * 100)
      : 0

    return {
      jobId: job.id,
      status: job.status,
      type: job.type,
      totalTracks: job.totalTracks,
      processed: job.processed,
      failed: job.failed,
      progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      errors: job.errors
    }

  } catch (error) {
    console.error('[Analysis Status] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to get job status'
    })
  }
})
