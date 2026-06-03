import 'dotenv/config'
import { prisma } from '../server/utils/prisma'
import { processAnalysisJob } from '../server/utils/analysis-worker'
import { getCachedAudio } from '../server/utils/audio-cache'
import { r2Configured, uploadAudioFile, audioKey } from '../server/utils/r2'

/**
 * Tracklib DJ-analysis worker.
 *
 * Vercel (serverless) can't run yt-dlp/ffmpeg or long background jobs, so it
 * only enqueues: /api/analysis/start writes a pending AnalysisJob to Neon. This
 * always-on process polls Neon, atomically claims one pending job at a time,
 * and runs the existing analysis pipeline — writing BPM/key/energy back to the
 * shared database, where the live site picks them up.
 *
 * Run it: `npm run worker` (locally) or via Docker (see worker/README.md).
 */

const POLL_MS = Number(process.env.WORKER_POLL_MS || 5000)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let running = true

interface ClaimedJob {
  id: string
  userId: string
  trackIds: string[]
}

/**
 * Atomically claim the oldest pending job. FOR UPDATE SKIP LOCKED makes this
 * safe even if more than one worker is running — no two grab the same job.
 */
async function claimNextJob(): Promise<ClaimedJob | null> {
  const rows = await prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "AnalysisJob"
    SET status = 'in_progress', "startedAt" = now()
    WHERE id = (
      SELECT id FROM "AnalysisJob"
      WHERE status = 'pending'
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "userId", "trackIds"
  `
  return rows[0] ?? null
}

/**
 * Fetch + upload audio for one track the app flagged (R2 mode only).
 * Returns true if it handled one (so the loop doesn't sleep).
 */
async function processOneAudioRequest(): Promise<boolean> {
  const track = await prisma.track.findFirst({
    where: { audioRequestedAt: { not: null }, audioReady: false, youtubeId: { not: null } },
    orderBy: { audioRequestedAt: 'asc' },
    select: { id: true, youtubeId: true },
  })
  if (!track?.youtubeId) return false

  console.log(`[Worker] Fetching audio for track ${track.id} (${track.youtubeId})`)
  try {
    const filePath = await getCachedAudio(track.youtubeId)
    await uploadAudioFile(audioKey(track.youtubeId), filePath)
    await prisma.track.update({
      where: { id: track.id },
      data: { audioReady: true, audioRequestedAt: null },
    })
    console.log(`[Worker] Audio ready for ${track.id}`)
  } catch (e) {
    console.error(`[Worker] Audio fetch failed for ${track.id}:`, e)
    // Clear the flag so it doesn't spin; the user can re-trigger by playing again.
    await prisma.track.update({
      where: { id: track.id },
      data: { audioRequestedAt: null },
    }).catch(() => {})
  }
  return true
}

async function main() {
  if (!YOUTUBE_API_KEY) {
    console.error('[Worker] YOUTUBE_API_KEY is not set — cannot resolve videos. Set it and restart.')
    process.exit(1)
  }

  console.log(`[Worker] Analysis worker started (polling every ${POLL_MS}ms)`)

  // Recover jobs interrupted by a previous crash/restart (single-worker safe).
  const requeued = await prisma.analysisJob.updateMany({
    where: { status: 'in_progress' },
    data: { status: 'pending' },
  })
  if (requeued.count > 0) {
    console.log(`[Worker] Requeued ${requeued.count} interrupted job(s)`)
  }

  if (r2Configured()) {
    console.log('[Worker] R2 configured — will fulfil audio cache requests too')
  }

  while (running) {
    let didWork = false

    // Audio cache requests (R2 mode). Cheap when there's nothing to do.
    if (r2Configured()) {
      try {
        didWork = await processOneAudioRequest()
      } catch (e) {
        console.error('[Worker] Audio request error:', e)
      }
    }

    let job: ClaimedJob | null = null
    try {
      job = await claimNextJob()
    } catch (e) {
      console.error('[Worker] Failed to claim a job:', e)
    }

    if (job) {
      didWork = true
      console.log(`[Worker] Claimed job ${job.id} (${job.trackIds.length} tracks)`)
      try {
        await processAnalysisJob({
          jobId: job.id,
          userId: job.userId,
          trackIds: job.trackIds,
          youtubeApiKey: YOUTUBE_API_KEY,
        })
      } catch (e) {
        // processAnalysisJob marks the job failed on its own; this is a backstop.
        console.error(`[Worker] Job ${job.id} crashed:`, e)
        await prisma.analysisJob
          .update({ where: { id: job.id }, data: { status: 'failed' } })
          .catch(() => {})
      }
    }

    if (!didWork) await sleep(POLL_MS)
  }

  console.log('[Worker] Shutting down…')
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => { running = false })
process.on('SIGTERM', () => { running = false })

main().catch(async (e) => {
  console.error('[Worker] Fatal error:', e)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
