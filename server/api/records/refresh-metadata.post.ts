import { getDiscogsClient } from '~/server/utils/discogs-client'

/**
 * Refresh metadata for existing records
 * Fetches full release details from Discogs to populate missing fields
 * (tracklist, formats, country, etc.)
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

    const body = await readBody(event)
    const releaseId = body.releaseId

    if (!releaseId) {
      throw createError({
        statusCode: 400,
        message: 'Release ID required'
      })
    }

    // Get the release
    const release = await prisma.release.findUnique({
      where: { id: releaseId }
    })

    if (!release || !release.discogsId) {
      throw createError({
        statusCode: 404,
        message: 'Release not found'
      })
    }

    // Fetch full details from Discogs
    const credentials = JSON.parse(user.discogsToken)
    const { token, secret } = credentials

    const discogsClient = getDiscogsClient()
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
    const updatedRelease = await prisma.release.update({
      where: { id: releaseId },
      data: {
        country: fullRelease.country || release.country,
        formats: formats.length > 0 ? formats : release.formats,
        styles: fullRelease.styles || release.styles,
        communityHave: communityHave || release.communityHave,
        communityWant: communityWant || release.communityWant,
        discogsData: fullRelease as any, // Store full data including tracklist
      }
    })

    return { release: updatedRelease }

  } catch (error) {
    console.error('[Refresh Metadata] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to refresh metadata'
    })
  }
})
