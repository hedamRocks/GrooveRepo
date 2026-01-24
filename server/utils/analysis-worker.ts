import { resolveYouTubeVideo, type TrackMetadata } from './youtube-resolver'
import { downloadAudioToBuffer } from './audio-streamer'
import { analyzeAudio } from './audio-analyzer'
import { normalizeBPM, getLibraryMedianBPM } from './bpm-normalizer'
import { normalizeEnergy } from './energy-calculator'

/**
 * Analysis Worker - Track-based
 * Orchestrates the complete pipeline from track to analyzed DJ metadata
 */

/**
 * Generic retry utility with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number
    initialDelayMs?: number
    maxDelayMs?: number
    operationName?: string
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 500,
    maxDelayMs = 5000,
    operationName = 'operation'
  } = options

  let lastError: Error | unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt === maxAttempts) {
        console.error(`[Retry] ${operationName} failed after ${maxAttempts} attempts:`, error)
        throw error
      }

      // Calculate exponential backoff delay
      const delayMs = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs
      )

      console.log(`[Retry] ${operationName} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}

export interface AnalysisJobContext {
  jobId: string
  userId: string
  trackIds: string[]
  youtubeApiKey: string
}

export interface AnalysisResult {
  success: boolean
  bpm?: number
  key?: string
  energy?: number
  youtubeId?: string
  youtubeTitle?: string
  confidence?: number
  error?: string
}

/**
 * Process a full analysis job (track-based)
 */
export async function processAnalysisJob(context: AnalysisJobContext): Promise<void> {
  const { jobId, userId, trackIds, youtubeApiKey } = context

  try {
    // Update job status to in_progress (with retry)
    await retryWithBackoff(
      async () => {
        return await prisma.analysisJob.update({
          where: { id: jobId },
          data: {
            status: 'in_progress',
            startedAt: new Date(),
            totalTracks: trackIds.length
          }
        })
      },
      {
        maxAttempts: 3,
        operationName: `Update job ${jobId} to in_progress`
      }
    )

    console.log(`[Analysis Worker] Starting job ${jobId} for ${trackIds.length} tracks`)

    // Get library median BPM for context-aware normalization
    const libraryMedianBPM = await getLibraryMedianBPM()

    // Process each track
    for (const trackId of trackIds) {
      try {
        await processTrack({
          trackId,
          jobId,
          youtubeApiKey,
          libraryMedianBPM
        })

        // Increment processed count (with retry)
        await retryWithBackoff(
          async () => {
            return await prisma.analysisJob.update({
              where: { id: jobId },
              data: {
                processed: { increment: 1 }
              }
            })
          },
          {
            maxAttempts: 3,
            operationName: `Increment processed count for job ${jobId}`
          }
        )

      } catch (error) {
        console.error(`[Analysis Worker] Failed to process track ${trackId}:`, error)

        // Increment failed count (with retry)
        await retryWithBackoff(
          async () => {
            return await prisma.analysisJob.update({
              where: { id: jobId },
              data: {
                processed: { increment: 1 },
                failed: { increment: 1 }
              }
            })
          },
          {
            maxAttempts: 3,
            operationName: `Increment failed count for job ${jobId}`
          }
        )

        // Log error
        await logJobError(jobId, trackId, error)
      }

      // Small delay to respect rate limits
      await sleep(1000)
    }

    // Mark job as completed (with retry)
    await retryWithBackoff(
      async () => {
        return await prisma.analysisJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            completedAt: new Date()
          }
        })
      },
      {
        maxAttempts: 3,
        operationName: `Mark job ${jobId} as completed`
      }
    )

    console.log(`[Analysis Worker] Job ${jobId} completed`)

  } catch (error) {
    console.error(`[Analysis Worker] Job ${jobId} failed:`, error)

    // Mark job as failed (with retry)
    await retryWithBackoff(
      async () => {
        return await prisma.analysisJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      },
      {
        maxAttempts: 3,
        operationName: `Mark job ${jobId} as failed`
      }
    )
  }
}

/**
 * Process a single track
 */
async function processTrack(params: {
  trackId: string
  jobId: string
  youtubeApiKey: string
  libraryMedianBPM?: number
}): Promise<AnalysisResult> {
  const { trackId, youtubeApiKey, libraryMedianBPM } = params

  console.log(`[Analysis Worker] Processing track ${trackId}`)

  // Fetch track with release data
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      userRecord: {
        include: {
          release: true
        }
      }
    }
  })

  if (!track || !track.userRecord || !track.userRecord.release) {
    throw new Error('Track or record not found')
  }

  // Note: Removed skip logic to allow re-analysis of tracks
  // This enables users to fix incorrect BPM/key values

  const release = track.userRecord.release

  // Step 1: Resolve YouTube video
  const trackMetadata: TrackMetadata = {
    artist: release.artist || 'Unknown',
    title: track.title, // Just track title (simplified for better YouTube matching)
    duration: track.duration || undefined
  }

  const resolvedVideo = await resolveYouTubeVideo(trackMetadata, youtubeApiKey)

  if (!resolvedVideo) {
    throw new Error('Failed to resolve YouTube video')
  }

  console.log(`[Analysis Worker] Resolved to YouTube: ${resolvedVideo.videoId} (${resolvedVideo.duration}s)`)

  // Step 2: Download audio with smart sampling (30s @ 20% into track)
  const sampleStart = Math.floor(resolvedVideo.duration * 0.20) // 20% into the track
  const sampleDuration = 30 // 30 seconds

  const audioBuffer = await downloadAudioToBuffer({
    videoId: resolvedVideo.videoId,
    format: 'mp3',
    sampleStart,
    sampleDuration
  })

  console.log(`[Analysis Worker] Downloaded audio sample: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB (${sampleDuration}s @ ${sampleStart}s)`)

  // Step 3: Analyze audio (no need to pass sampling options since we already sampled during download)
  const features = await analyzeAudio(audioBuffer)

  console.log(`[Analysis Worker] Analyzed: BPM=${features.bpm}, Key=${features.key}`)

  // Step 4: Normalize BPM with genre awareness
  const normalizedBPM = normalizeBPM({
    rawBPM: features.bpm,
    confidence: features.bpmConfidence,
    candidates: features.bpmCandidates,
    libraryMedianBPM,
    trackTitle: track.title,
    releaseTitle: release.title || undefined,
    styles: release.styles || undefined
  })

  // Step 5: Normalize energy
  const normalizedEnergy = await normalizeEnergy(features.rawEnergy)

  console.log(`[Analysis Worker] Normalized: BPM=${normalizedBPM.bpm}, Energy=${normalizedEnergy.toFixed(3)}`)

  // Step 6: Update Track with metadata (with retry)
  await retryWithBackoff(
    async () => {
      return await prisma.track.update({
        where: { id: trackId },
        data: {
          youtubeId: resolvedVideo.videoId,
          youtubeTitle: resolvedVideo.title,
          bpm: normalizedBPM.bpm,
          key: features.key,
          energy: Math.round(normalizedEnergy * 10), // Store as 0-10 scale
          confidence: features.bpmConfidence,
          analyzedAt: new Date()
        }
      })
    },
    {
      maxAttempts: 3,
      operationName: `Save analysis for track ${trackId}`
    }
  )

  console.log(`[Analysis Worker] Saved analysis for track ${trackId}`)

  return {
    success: true,
    bpm: normalizedBPM.bpm,
    key: features.key,
    energy: normalizedEnergy,
    youtubeId: resolvedVideo.videoId,
    youtubeTitle: resolvedVideo.title,
    confidence: features.bpmConfidence
  }
}

/**
 * Log error for a job
 */
async function logJobError(jobId: string, trackId: string, error: unknown): Promise<void> {
  const job = await prisma.analysisJob.findUnique({
    where: { id: jobId }
  })

  if (!job) return

  const errors = (job.errors as any[]) || []
  errors.push({
    trackId,
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString()
  })

  await prisma.analysisJob.update({
    where: { id: jobId },
    data: { errors }
  })
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Simple in-memory job queue with actual concurrency
 */
class AnalysisQueue {
  private activeJobs = 0
  private readonly maxConcurrentJobs = 1 // Process one job at a time to avoid rate limits
  private queue: AnalysisJobContext[] = []

  async add(context: AnalysisJobContext): Promise<void> {
    console.log(`[Analysis Queue] Adding job ${context.jobId} to queue (${this.queue.length} in queue, ${this.activeJobs} active)`)
    this.queue.push(context)
    this.processNext()
  }

  private async processNext(): Promise<void> {
    // Start new jobs if we have capacity and items in queue
    while (this.activeJobs < this.maxConcurrentJobs && this.queue.length > 0) {
      const context = this.queue.shift()
      if (!context) break

      this.activeJobs++
      console.log(`[Analysis Queue] Starting job ${context.jobId} (${this.activeJobs}/${this.maxConcurrentJobs} active)`)

      // Process job without blocking (fire and forget)
      processAnalysisJob(context)
        .catch((error) => {
          console.error('[Analysis Queue] Error processing job:', error)
        })
        .finally(() => {
          this.activeJobs--
          console.log(`[Analysis Queue] Completed job ${context.jobId} (${this.activeJobs}/${this.maxConcurrentJobs} active, ${this.queue.length} in queue)`)
          // Try to process next job after this one completes
          this.processNext()
        })
    }
  }
}

// Singleton queue instance
const analysisQueue = new AnalysisQueue()

export function queueAnalysisJob(context: AnalysisJobContext): void {
  analysisQueue.add(context)
}
