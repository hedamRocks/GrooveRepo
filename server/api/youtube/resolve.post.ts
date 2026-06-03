/**
 * Resolve a track to a YouTube video ID for in-browser playback.
 * Uses the track's cached youtubeId when present (free); otherwise runs the
 * resolver (costs ~100 YouTube quota units) and caches the result back on the
 * track so the next play is free.
 */

import { resolveYouTubeVideo } from '~/server/utils/youtube-resolver'

export default defineEventHandler(async (event) => {
  try {
    const userEmail = getCookie(event, 'user_email')
    if (!userEmail) {
      throw createError({ statusCode: 401, message: 'Authentication required' })
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }

    const body = await readBody(event)
    const trackId = (body?.trackId as string) || ''
    if (!trackId) {
      throw createError({ statusCode: 400, message: 'trackId is required' })
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        userRecord: {
          include: { release: { select: { artist: true, title: true } } }
        }
      }
    })

    if (!track || track.userRecord.userId !== user.id) {
      throw createError({ statusCode: 404, message: 'Track not found' })
    }

    // Already resolved → free
    if (track.youtubeId) {
      return {
        videoId: track.youtubeId,
        title: track.youtubeTitle || track.title,
        cached: true
      }
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      throw createError({
        statusCode: 503,
        message: 'YouTube lookup is not configured (missing YOUTUBE_API_KEY)'
      })
    }

    const artist = track.userRecord.release?.artist || 'Unknown Artist'
    const resolved = await resolveYouTubeVideo(
      { artist, title: track.title },
      apiKey
    )

    if (!resolved) {
      throw createError({ statusCode: 404, message: 'No YouTube match found for this track' })
    }

    // Cache for next time
    await prisma.track.update({
      where: { id: trackId },
      data: { youtubeId: resolved.videoId, youtubeTitle: resolved.title }
    })

    return { videoId: resolved.videoId, title: resolved.title, cached: false }

  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('[YouTube Resolve] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to resolve YouTube video'
    })
  }
})
