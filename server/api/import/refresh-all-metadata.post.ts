/**
 * Refresh metadata for ALL records by fetching full release details from Discogs
 * This is a heavy operation that should be run infrequently
 * Supports resumable operation - only fetches records without discogsData
 */

export default defineEventHandler(async (event) => {
  try {
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

    if (!user || !user.discogsToken) {
      throw createError({
        statusCode: 401,
        message: 'Discogs account not connected'
      })
    }

    // Only get records that haven't been refreshed yet (no discogsData or missing community data)
    const userRecords = await prisma.userRecord.findMany({
      where: {
        userId: user.id,
        release: {
          OR: [
            { discogsData: null },
            { communityHave: null },
            { communityWant: null }
          ]
        }
      },
      include: { release: true }
    })

    const credentials = JSON.parse(user.discogsToken)
    const { token, secret } = credentials
    const discogsClient = getDiscogsClient()

    let updated = 0
    let failed = 0

    console.log(`[Refresh All] Starting metadata refresh for ${userRecords.length} records`)

    for (const userRecord of userRecords) {
      try {
        const release = userRecord.release

        if (!release.discogsId) {
          console.log(`[Refresh All] Skipping ${release.id} - no Discogs ID`)
          continue
        }

        // Fetch full release details from Discogs
        const fullRelease = await discogsClient.getRelease(release.discogsId, token, secret)

        // Extract formats
        const formats = fullRelease.formats?.flatMap((fmt: any) => {
          const parts = []
          if (fmt.name) parts.push(fmt.name)
          if (fmt.descriptions) parts.push(...fmt.descriptions)
          return parts
        }) || []

        // Extract community data
        const communityHave = fullRelease.community?.have || null
        const communityWant = fullRelease.community?.want || null

        // Update release with full details
        await prisma.release.update({
          where: { id: release.id },
          data: {
            country: fullRelease.country || release.country,
            formats: formats.length > 0 ? formats : release.formats,
            styles: fullRelease.styles || release.styles,
            communityHave: communityHave || release.communityHave,
            communityWant: communityWant || release.communityWant,
            discogsData: fullRelease as any, // Store full data including tracklist
          }
        })

        updated++

        if (updated % 10 === 0) {
          console.log(`[Refresh All] Progress: ${updated}/${userRecords.length}`)
        }

      } catch (error) {
        console.error(`[Refresh All] Failed to refresh ${userRecord.id}:`, error)
        failed++
      }
    }

    console.log(`[Refresh All] Complete: ${updated} updated, ${failed} failed`)

    return {
      success: true,
      updated,
      failed,
      total: userRecords.length
    }

  } catch (error) {
    console.error('[Refresh All] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to refresh metadata'
    })
  }
})
