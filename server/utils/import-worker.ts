import type { DiscogsCollectionItem } from './discogs-client'

/**
 * Background worker for importing Discogs collections
 * Processes import jobs and updates progress in real-time
 */

interface ImportJobContext {
  jobId: string
  userId: string
  accessToken: string
  accessTokenSecret: string
  username: string
}

/**
 * Main import worker - processes a full collection import
 */
export async function processDiscogsImport(context: ImportJobContext): Promise<void> {
  const { jobId, userId, accessToken, accessTokenSecret, username } = context
  const discogsClient = getDiscogsClient()

  try {
    // Update job status to in_progress
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      }
    })

    console.log(`[Import Worker] Starting import for user ${userId}, job ${jobId}`)

    // Fetch first page to get total count
    const firstPage = await discogsClient.getCollection(
      username,
      accessToken,
      accessTokenSecret,
      1,
      100
    )

    const totalPages = firstPage.pagination.pages
    const totalItems = firstPage.pagination.items

    console.log(`[Import Worker] Found ${totalItems} items across ${totalPages} pages`)

    // Update job with total count
    await prisma.importJob.update({
      where: { id: jobId },
      data: { totalItems }
    })

    // Process first page
    await processCollectionPage(userId, jobId, firstPage.releases)

    // Process remaining pages
    for (let page = 2; page <= totalPages; page++) {
      console.log(`[Import Worker] Processing page ${page}/${totalPages}`)

      const pageData = await discogsClient.getCollection(
        username,
        accessToken,
        accessTokenSecret,
        page,
        100
      )

      await processCollectionPage(userId, jobId, pageData.releases)
    }

    // Mark job as completed
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      }
    })

    // Update user's last import status
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastImportAt: new Date(),
        lastImportStatus: 'completed',
      }
    })

    console.log(`[Import Worker] Import completed for job ${jobId}`)

  } catch (error) {
    console.error(`[Import Worker] Import failed for job ${jobId}:`, error)

    // Mark job as failed
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: {
          error: error instanceof Error ? error.stack : String(error),
          timestamp: new Date().toISOString(),
        }
      }
    })

    // Update user's last import status
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastImportStatus: 'failed',
      }
    })
  }
}

/**
 * Process a single page of collection items
 */
async function processCollectionPage(
  userId: string,
  jobId: string,
  items: DiscogsCollectionItem[]
): Promise<void> {
  // Debug log first item to see what data is available
  if (items.length > 0) {
    const firstItem = items[0]
    console.log('[Import Worker DEBUG] First item in page:')
    console.log('  - Has media_condition:', !!firstItem.media_condition, firstItem.media_condition)
    console.log('  - Has sleeve_condition:', !!firstItem.sleeve_condition, firstItem.sleeve_condition)
    console.log('  - Has community:', !!firstItem.basic_information.community)
    console.log('  - Has tracklist in basic_info:', !!(firstItem.basic_information as any).tracklist)
    console.log('  - Basic info keys:', Object.keys(firstItem.basic_information))
  }

  for (const item of items) {
    try {
      await processCollectionItem(userId, item)

      // Increment processed count
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          processedItems: { increment: 1 }
        }
      })

    } catch (error) {
      console.error(`[Import Worker] Failed to process item ${item.id}:`, error)

      // Increment failed count but continue
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          failedItems: { increment: 1 },
          processedItems: { increment: 1 }
        }
      })
    }
  }
}

/**
 * Process a single collection item
 * Creates or finds Release, then creates UserRecord
 */
async function processCollectionItem(
  userId: string,
  item: DiscogsCollectionItem
): Promise<void> {
  const basicInfo = item.basic_information

  // Flatten artist names
  const artistString = basicInfo.artists
    ?.map(a => a.name)
    .filter(name => name !== 'Various')
    .join(', ') || null

  // Get primary label and catalog number
  const primaryLabel = basicInfo.labels?.[0]
  const labelName = primaryLabel?.name || null
  const catNo = primaryLabel?.catno || null

  // Flatten formats array from basic info
  const formats = (basicInfo as any).formats?.flatMap((fmt: any) => {
    const parts = []
    if (fmt.name) parts.push(fmt.name)
    if (fmt.descriptions) parts.push(...fmt.descriptions)
    return parts
  }) || []

  // Extract community data
  const communityHave = basicInfo.community?.have || null
  const communityWant = basicInfo.community?.want || null

  // Try to find existing release by Discogs ID
  let release = await prisma.release.findUnique({
    where: { discogsId: basicInfo.id }
  })

  // Create or update release
  if (!release) {
    // Create new release
    release = await prisma.release.create({
      data: {
        discogsId: basicInfo.id,
        discogsMasterId: basicInfo.master_id || null,
        title: basicInfo.title,
        artist: artistString,
        label: labelName,
        catNo: catNo,
        year: basicInfo.year || null,
        country: (basicInfo as any).country || null,
        genres: basicInfo.genres || [],
        styles: basicInfo.styles || [],
        formats: formats,
        coverUrl: basicInfo.cover_image || null,
        thumbUrl: basicInfo.thumb || null,
        communityHave: communityHave,
        communityWant: communityWant,
        discogsData: basicInfo as any,
      }
    })
  } else {
    // Update existing release with new fields (if they're missing)
    release = await prisma.release.update({
      where: { id: release.id },
      data: {
        // Only update fields that might be missing from old imports
        country: (basicInfo as any).country || release.country,
        styles: basicInfo.styles && basicInfo.styles.length > 0 ? basicInfo.styles : release.styles,
        formats: formats.length > 0 ? formats : release.formats,
        coverUrl: basicInfo.cover_image || release.coverUrl,
        thumbUrl: basicInfo.thumb || release.thumbUrl,
        communityHave: communityHave || release.communityHave,
        communityWant: communityWant || release.communityWant,
        discogsData: basicInfo as any, // Always update to get latest data
      }
    })
  }

  // Check if user already has this record
  const existingUserRecord = await prisma.userRecord.findUnique({
    where: {
      userId_releaseId: {
        userId,
        releaseId: release.id
      }
    }
  })

  // Prepare user record data with condition info
  const userRecordData = {
    userId,
    releaseId: release.id,
    instanceId: item.instance_id,
    addedToDiscogsAt: new Date(item.date_added),
    mediaCondition: item.media_condition || null,
    sleeveCondition: item.sleeve_condition || null,
  }

  if (!existingUserRecord) {
    // Create new user record
    await prisma.userRecord.create({
      data: userRecordData
    })
  } else {
    // Update existing record with condition data if it's missing
    await prisma.userRecord.update({
      where: { id: existingUserRecord.id },
      data: {
        mediaCondition: item.media_condition || existingUserRecord.mediaCondition,
        sleeveCondition: item.sleeve_condition || existingUserRecord.sleeveCondition,
      }
    })
  }
}

/**
 * Simple in-memory queue for processing imports
 * In production, replace with Redis/BullMQ
 */
class ImportQueue {
  private processing = false
  private queue: ImportJobContext[] = []

  async add(context: ImportJobContext): Promise<void> {
    this.queue.push(context)
    this.processNext()
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true
    const context = this.queue.shift()

    if (context) {
      try {
        await processDiscogsImport(context)
      } catch (error) {
        console.error('[Import Queue] Error processing job:', error)
      }
    }

    this.processing = false

    // Process next item if queue has more
    if (this.queue.length > 0) {
      this.processNext()
    }
  }
}

// Singleton queue instance
const importQueue = new ImportQueue()

export function queueDiscogsImport(context: ImportJobContext): void {
  importQueue.add(context)
}
