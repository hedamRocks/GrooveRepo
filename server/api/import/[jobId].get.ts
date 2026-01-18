/**
 * Get import job status
 * Used for polling progress during background import
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

    // Get job ID from route params
    const jobId = getRouterParam(event, 'jobId')

    if (!jobId) {
      throw createError({
        statusCode: 400,
        message: 'Job ID required'
      })
    }

    // Fetch import job
    const importJob = await prisma.importJob.findUnique({
      where: { id: jobId }
    })

    if (!importJob) {
      throw createError({
        statusCode: 404,
        message: 'Import job not found'
      })
    }

    // Verify job belongs to current user
    if (importJob.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied'
      })
    }

    // Calculate progress percentage
    const progress = importJob.totalItems
      ? Math.round((importJob.processedItems / importJob.totalItems) * 100)
      : 0

    return {
      id: importJob.id,
      status: importJob.status,
      progress,
      totalItems: importJob.totalItems,
      processedItems: importJob.processedItems,
      failedItems: importJob.failedItems,
      errorMessage: importJob.errorMessage,
      startedAt: importJob.startedAt,
      completedAt: importJob.completedAt,
    }

  } catch (error) {
    console.error('[Import Status] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to get import status'
    })
  }
})
