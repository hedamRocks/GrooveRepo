/**
 * Get a single setlist with all tracks
 * Includes full track details, release info, and manual BPM overrides
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

    const setlist = await prisma.setlist.findUnique({
      where: {
        id: setlistId,
        userId: user.id
      },
      include: {
        tracks: {
          include: {
            track: {
              include: {
                userRecord: {
                  include: {
                    release: true
                  }
                },
                trackTags: {
                  include: {
                    tag: {
                      select: {
                        id: true,
                        name: true,
                        color: true,
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            sortOrder: 'asc'
          }
        }
      }
    })

    if (!setlist) {
      throw createError({
        statusCode: 404,
        message: 'Setlist not found'
      })
    }

    return {
      setlist: {
        id: setlist.id,
        name: setlist.name,
        description: setlist.description,
        venue: setlist.venue,
        date: setlist.date,
        duration: setlist.duration,
        createdAt: setlist.createdAt,
        updatedAt: setlist.updatedAt,
        tracks: setlist.tracks.map(st => ({
          id: st.id,
          trackId: st.track.id,
          sortOrder: st.sortOrder,
          manualBpm: st.manualBpm,
          notes: st.notes,
          addedAt: st.addedAt,
          track: {
            id: st.track.id,
            position: st.track.position,
            title: st.track.title,
            artist: st.track.userRecord.release.artist,
            duration: st.track.duration,
            bpm: st.track.bpm,
            key: st.track.key,
            energy: st.track.energy,
            confidence: st.track.confidence,
            trackTags: st.track.trackTags,
            userRecord: {
              release: {
                thumbUrl: st.track.userRecord.release.thumbUrl,
                country: st.track.userRecord.release.country,
              }
            }
          }
        }))
      }
    }

  } catch (error) {
    console.error('[Setlists] Get setlist error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch setlist'
    })
  }
})
