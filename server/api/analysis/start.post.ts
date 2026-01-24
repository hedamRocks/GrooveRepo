/**
 * Start DJ metadata analysis job
 * Creates AnalysisJob and queues background worker
 */

import { queueAnalysisJob } from '~/server/utils/analysis-worker'

export default defineEventHandler(async (event) => {
  try {
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

    // Parse request body
    const body = await readBody(event)
    const { recordIds, trackIds, analyzeAll } = body as {
      recordIds?: string[]
      trackIds?: string[]
      analyzeAll?: boolean
    }

    // Get YouTube API key from config
    const config = useRuntimeConfig()
    const youtubeApiKey = config.youtubeApiKey

    if (!youtubeApiKey) {
      throw createError({
        statusCode: 500,
        message: 'YouTube API key not configured. Please set YOUTUBE_API_KEY environment variable.'
      })
    }

    // Check if there's already an active analysis job
    const existingJob = await prisma.analysisJob.findFirst({
      where: {
        userId: user.id,
        status: { in: ['pending', 'in_progress'] }
      }
    })

    if (existingJob) {
      return {
        jobId: existingJob.id,
        status: existingJob.status,
        message: 'Analysis already in progress'
      }
    }

    // Determine what to analyze
    let targetTrackIds: string[]
    let jobType: string

    if (trackIds && trackIds.length > 0) {
      // Analyze specific tracks (NEW)
      targetTrackIds = trackIds
      jobType = 'selected_tracks'
      console.log(`[Analysis Start] Creating job for ${targetTrackIds.length} tracks`)
    } else if (recordIds && recordIds.length > 0) {
      // Analyze all tracks from specific records (including re-analysis)
      const tracks = await prisma.track.findMany({
        where: {
          userRecordId: { in: recordIds }
          // Removed bpm: null filter to allow re-analysis
        },
        select: { id: true }
      })
      targetTrackIds = tracks.map(t => t.id)
      jobType = 'selected_records'
      console.log(`[Analysis Start] Creating job for ${recordIds.length} records (${targetTrackIds.length} tracks)`)
    } else if (analyzeAll) {
      // Get all tracks that don't have analysis yet
      const userRecords = await prisma.userRecord.findMany({
        where: { userId: user.id },
        select: { id: true }
      })

      const tracks = await prisma.track.findMany({
        where: {
          userRecordId: { in: userRecords.map(r => r.id) },
          bpm: null // Only tracks without analysis
        },
        select: { id: true }
      })
      targetTrackIds = tracks.map(t => t.id)
      jobType = 'full_library'
      console.log(`[Analysis Start] Creating job for full library (${targetTrackIds.length} tracks)`)
    } else {
      throw createError({
        statusCode: 400,
        message: 'Must provide either trackIds, recordIds, or analyzeAll=true'
      })
    }

    if (targetTrackIds.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No tracks to analyze'
      })
    }

    // Create analysis job
    const analysisJob = await prisma.analysisJob.create({
      data: {
        userId: user.id,
        type: jobType,
        trackIds: targetTrackIds,
        recordIds: recordIds || [],
        status: 'pending',
        totalTracks: targetTrackIds.length
      }
    })

    // Queue analysis worker
    queueAnalysisJob({
      jobId: analysisJob.id,
      userId: user.id,
      trackIds: targetTrackIds,
      youtubeApiKey
    })

    console.log(`[Analysis Start] Created job ${analysisJob.id}`)

    return {
      jobId: analysisJob.id,
      status: 'pending',
      totalTracks: targetTrackIds.length,
      message: 'Analysis started'
    }

  } catch (error) {
    console.error('[Analysis Start] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to start analysis'
    })
  }
})
