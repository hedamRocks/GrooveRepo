import { syncTracksForUserRecord } from './track-sync'

/**
 * Resumable background pass that fetches full Discogs releases (tracklists) for
 * records that were imported with only basic_information.
 *
 * Resumable by design: it queries the records still missing a tracklist each
 * time it runs and each fetch is idempotent, so a stopped/failed job simply
 * picks up the remaining work when started again.
 */

export interface BackfillContext {
  jobId: string
  userId: string
  token: string
  secret: string
}

interface Candidate {
  userRecordId: string
  releaseId: string
  discogsId: number
}

/** Count of the user's records still missing a tracklist. */
export async function countMissingTracklists(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "UserRecord" ur
    JOIN "Release" r ON r.id = ur."releaseId"
    WHERE ur."userId" = ${userId}
      AND r."discogsId" IS NOT NULL
      AND COALESCE(jsonb_array_length(r."discogsData"->'tracklist'), 0) = 0
  `
  return rows[0]?.count ?? 0
}

export async function processTracklistBackfill(context: BackfillContext): Promise<void> {
  const { jobId, userId, token, secret } = context
  const discogsClient = getDiscogsClient()

  try {
    await prisma.tracklistJob.update({
      where: { id: jobId },
      data: { status: 'in_progress', startedAt: new Date() },
    })

    // Records still missing a tracklist (resume point — recomputed each run)
    const candidates = await prisma.$queryRaw<Candidate[]>`
      SELECT ur.id AS "userRecordId", r.id AS "releaseId", r."discogsId" AS "discogsId"
      FROM "UserRecord" ur
      JOIN "Release" r ON r.id = ur."releaseId"
      WHERE ur."userId" = ${userId}
        AND r."discogsId" IS NOT NULL
        AND COALESCE(jsonb_array_length(r."discogsData"->'tracklist'), 0) = 0
    `

    await prisma.tracklistJob.update({
      where: { id: jobId },
      data: { totalItems: candidates.length },
    })

    console.log(`[Tracklist Backfill] ${candidates.length} records to fetch for job ${jobId}`)

    let processed = 0
    let failed = 0

    for (const c of candidates) {
      try {
        const release = await prisma.release.findUnique({
          where: { id: c.releaseId },
          select: { id: true, discogsId: true, country: true, genres: true, styles: true, year: true },
        })

        if (release?.discogsId) {
          const full = await discogsClient.getRelease(release.discogsId, token, secret)
          await prisma.release.update({
            where: { id: release.id },
            data: {
              discogsData: full as any,
              country: full.country || release.country,
              genres: full.genres?.length ? full.genres : release.genres,
              styles: full.styles?.length ? full.styles : release.styles,
              year: full.year || release.year,
            },
          })

          const tracklist = (full as any)?.tracklist
          if (Array.isArray(tracklist) && tracklist.length > 0) {
            await syncTracksForUserRecord(c.userRecordId)
          }
        }
        processed++
      } catch (err) {
        console.error(`[Tracklist Backfill] Failed for release ${c.discogsId}:`, err)
        failed++
      }

      await prisma.tracklistJob.update({
        where: { id: jobId },
        data: { processedItems: processed, failedItems: failed },
      })
    }

    await prisma.tracklistJob.update({
      where: { id: jobId },
      data: { status: 'completed', completedAt: new Date() },
    })

    console.log(`[Tracklist Backfill] Job ${jobId} complete: ${processed} processed, ${failed} failed`)
  } catch (error) {
    console.error(`[Tracklist Backfill] Job ${jobId} failed:`, error)
    await prisma.tracklistJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}

/** Simple in-memory queue (mirrors the import queue). */
class BackfillQueue {
  private processing = false
  private queue: BackfillContext[] = []

  add(context: BackfillContext): void {
    this.queue.push(context)
    this.processNext()
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    this.processing = true
    const context = this.queue.shift()
    if (context) {
      try {
        await processTracklistBackfill(context)
      } catch (error) {
        console.error('[Tracklist Backfill Queue] Error:', error)
      }
    }
    this.processing = false
    if (this.queue.length > 0) this.processNext()
  }
}

const backfillQueue = new BackfillQueue()

export function queueTracklistBackfill(context: BackfillContext): void {
  backfillQueue.add(context)
}
