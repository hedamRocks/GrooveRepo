/**
 * Streams a track's full audio as MP3 for the Web Audio player.
 * Resolves the track's youtubeId (cached on the track, else resolved + cached),
 * downloads/caches the audio, and streams the file. Local-only (needs yt-dlp).
 */

import { createReadStream, statSync } from 'fs'
import { resolveYouTubeVideo } from '~/server/utils/youtube-resolver'
import { getCachedAudio } from '~/server/utils/audio-cache'

export default defineEventHandler(async (event) => {
  const userEmail = getCookie(event, 'user_email')
  if (!userEmail) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const trackId = getRouterParam(event, 'trackId')
  if (!trackId) {
    throw createError({ statusCode: 400, message: 'trackId required' })
  }

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      userRecord: { include: { release: { select: { artist: true } } } }
    }
  })
  if (!track || track.userRecord.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Track not found' })
  }

  // Resolve youtubeId (cache on the track for next time)
  let videoId = track.youtubeId
  if (!videoId) {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      throw createError({ statusCode: 503, message: 'YouTube lookup not configured' })
    }
    const resolved = await resolveYouTubeVideo(
      { artist: track.userRecord.release?.artist || 'Unknown Artist', title: track.title },
      apiKey
    )
    if (!resolved) {
      throw createError({ statusCode: 404, message: 'No YouTube match for this track' })
    }
    videoId = resolved.videoId
    await prisma.track.update({
      where: { id: trackId },
      data: { youtubeId: resolved.videoId, youtubeTitle: resolved.title }
    })
  }

  let filePath: string
  try {
    filePath = await getCachedAudio(videoId)
  } catch (e: any) {
    console.error('[Audio] download failed:', e)
    throw createError({ statusCode: 502, message: e?.message || 'Failed to fetch audio' })
  }

  const { size } = statSync(filePath)
  setHeader(event, 'Content-Type', 'audio/mpeg')
  setHeader(event, 'Content-Length', size)
  setHeader(event, 'Accept-Ranges', 'bytes')
  setHeader(event, 'Cache-Control', 'private, max-age=86400')
  return sendStream(event, createReadStream(filePath))
})
