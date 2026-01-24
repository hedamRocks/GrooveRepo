/**
 * Update manual BPM override for a track in a setlist
 * This is separate from the track's analyzed BPM
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
        statusCode: 401,
        message: 'User not found'
      })
    }

    const setlistId = getRouterParam(event, 'id')
    if (!setlistId) {
      throw createError({
        statusCode: 400,
        message: 'Setlist ID required'
      })
    }

    // Verify ownership
    const setlist = await prisma.setlist.findUnique({
      where: {
        id: setlistId,
        userId: user.id
      }
    })

    if (!setlist) {
      throw createError({
        statusCode: 404,
        message: 'Setlist not found'
      })
    }

    const body = await readBody(event)
    const { trackId, manualBpm } = body

    if (!trackId) {
      throw createError({
        statusCode: 400,
        message: 'Track ID required'
      })
    }

    if (manualBpm !== null && (typeof manualBpm !== 'number' || manualBpm < 30 || manualBpm > 300)) {
      throw createError({
        statusCode: 400,
        message: 'Manual BPM must be between 30 and 300, or null to clear'
      })
    }

    // Update both the setlist track and the underlying track
    const [setlistTrack, track] = await prisma.$transaction([
      prisma.setlistTrack.update({
        where: {
          setlistId_trackId: {
            setlistId,
            trackId
          }
        },
        data: {
          manualBpm: manualBpm
        }
      }),
      prisma.track.update({
        where: {
          id: trackId
        },
        data: {
          bpm: manualBpm
        }
      })
    ])

    console.log(`[Setlists] Updated BPM for track ${trackId} to ${manualBpm} (persisted to Track model)`)

    return {
      success: true,
      manualBpm: setlistTrack.manualBpm,
      bpm: track.bpm
    }

  } catch (error) {
    console.error('[Setlists] Update BPM error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to update manual BPM'
    })
  }
})
