/**
 * Update track metadata (BPM, key, energy)
 * Allows manual correction of automated analysis
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

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    const trackId = getRouterParam(event, 'id')
    if (!trackId) {
      throw createError({
        statusCode: 400,
        message: 'Track ID required'
      })
    }

    // Get track and verify ownership
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        userRecord: true
      }
    })

    if (!track) {
      throw createError({
        statusCode: 404,
        message: 'Track not found'
      })
    }

    if (track.userRecord.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied'
      })
    }

    // Parse request body
    const body = await readBody(event)
    const { bpm, key, energy } = body as {
      bpm?: number
      key?: string
      energy?: number
    }

    // Validate inputs
    if (bpm !== undefined && (bpm < 20 || bpm > 300)) {
      throw createError({
        statusCode: 400,
        message: 'BPM must be between 20 and 300'
      })
    }

    if (energy !== undefined && (energy < 0 || energy > 10)) {
      throw createError({
        statusCode: 400,
        message: 'Energy must be between 0 and 10'
      })
    }

    // Update track
    const updatedTrack = await prisma.track.update({
      where: { id: trackId },
      data: {
        ...(bpm !== undefined && { bpm }),
        ...(key !== undefined && { key }),
        ...(energy !== undefined && { energy })
      }
    })

    console.log(`[Track Metadata] Updated track ${trackId}:`, { bpm, key, energy })

    return {
      success: true,
      track: updatedTrack
    }

  } catch (error) {
    console.error('[Track Metadata] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to update track metadata'
    })
  }
})
