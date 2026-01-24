import { getDiscogsClient } from '~/server/utils/discogs-client'

/**
 * Manually add a record via Discogs release ID
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
    const discogsId = parseInt(body.discogsId)

    if (!discogsId) {
      throw createError({
        statusCode: 400,
        message: 'Discogs release ID required'
      })
    }

    // Check if release already exists in our database
    let release = await prisma.release.findUnique({
      where: { discogsId }
    })

    // If not, fetch from Discogs and create
    if (!release) {
      const credentials = JSON.parse(user.discogsToken)
      const { token, secret } = credentials

      const discogsClient = getDiscogsClient()
      const discogsRelease = await discogsClient.getRelease(discogsId, token, secret)

      // Flatten artist names
      const artistString = discogsRelease.artists
        ?.map(a => a.name)
        .filter(name => name !== 'Various')
        .join(', ') || null

      // Get primary label
      const primaryLabel = discogsRelease.labels?.[0]

      // Get best cover image
      const coverImage = discogsRelease.images?.find(img => img.type === 'primary')?.uri
        || discogsRelease.images?.[0]?.uri
        || null

      // Flatten formats array into readable strings
      // Format structure: [{ name: "Vinyl", qty: "1", descriptions: ["LP", "Album"] }]
      const formats = discogsRelease.formats?.flatMap((fmt: any) => {
        const parts = []
        if (fmt.name) parts.push(fmt.name)
        if (fmt.descriptions) parts.push(...fmt.descriptions)
        return parts
      }) || []

      release = await prisma.release.create({
        data: {
          discogsId: discogsRelease.id,
          discogsMasterId: discogsRelease.master_id || null,
          title: discogsRelease.title,
          artist: artistString,
          label: primaryLabel?.name || null,
          catNo: primaryLabel?.catno || null,
          year: discogsRelease.year || null,
          country: discogsRelease.country || null,
          genres: discogsRelease.genres || [],
          styles: discogsRelease.styles || [],
          formats: formats,
          coverUrl: coverImage,
          thumbUrl: discogsRelease.thumb || null,
          discogsData: discogsRelease as any,
        }
      })
    }

    // Check if user already has this record
    const existingUserRecord = await prisma.userRecord.findUnique({
      where: {
        userId_releaseId: {
          userId: user.id,
          releaseId: release.id
        }
      }
    })

    if (existingUserRecord) {
      throw createError({
        statusCode: 400,
        message: 'You already have this record in your collection'
      })
    }

    // Create user record
    const userRecord = await prisma.userRecord.create({
      data: {
        userId: user.id,
        releaseId: release.id,
      },
      include: {
        release: true,
        shelfPlacements: {
          include: {
            shelf: true
          }
        }
      }
    })

    return { record: userRecord }

  } catch (error) {
    console.error('[Record Create] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to add record'
    })
  }
})
