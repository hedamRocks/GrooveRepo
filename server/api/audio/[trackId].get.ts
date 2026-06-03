/**
 * Serves a track's audio for the Web Audio player.
 *
 * Two modes:
 *  - R2 configured (production): if the MP3 is in R2 (audioReady), redirect to a
 *    short-lived signed URL; otherwise flag the track for the worker and return
 *    202 (the client retries). yt-dlp runs on the worker, not here.
 *  - R2 not configured (local dev): download/cache via yt-dlp and stream the MP3
 *    directly (the original behaviour — works on a machine with yt-dlp/ffmpeg).
 */

import { createReadStream, statSync } from 'fs'
import { resolveYouTubeVideo } from '~/server/utils/youtube-resolver'
import { getCachedAudio } from '~/server/utils/audio-cache'
import { r2Configured, presignAudioUrl, audioKey } from '~/server/utils/r2'

export default defineEventHandler(async (event) => {
  const userEmail = getCookie(event, 'user_email')
  if (!userEmail) throw createError({ statusCode: 401, message: 'Authentication required' })

  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user) throw createError({ statusCode: 404, message: 'User not found' })

  const trackId = getRouterParam(event, 'trackId')
  if (!trackId) throw createError({ statusCode: 400, message: 'trackId required' })

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: { userRecord: { include: { release: { select: { artist: true } } } } }
  })
  if (!track || track.userRecord.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Track not found' })
  }

  // Resolve youtubeId once and cache it on the track
  let videoId = track.youtubeId
  if (!videoId) {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) throw createError({ statusCode: 503, message: 'YouTube lookup not configured' })
    const resolved = await resolveYouTubeVideo(
      { artist: track.userRecord.release?.artist || 'Unknown Artist', title: track.title },
      apiKey
    )
    if (!resolved) throw createError({ statusCode: 404, message: 'No YouTube match for this track' })
    videoId = resolved.videoId
    await prisma.track.update({
      where: { id: trackId },
      data: { youtubeId: resolved.videoId, youtubeTitle: resolved.title }
    })
  }

  // --- R2 mode (production): redirect to cached audio, or ask the worker ---
  if (r2Configured()) {
    if (track.audioReady) {
      const url = await presignAudioUrl(audioKey(videoId))
      return sendRedirect(event, url, 302)
    }
    // Flag for the worker to fetch + upload (debounced)
    const staleMs = Date.now() - (track.audioRequestedAt?.getTime() ?? 0)
    if (!track.audioRequestedAt || staleMs > 60_000) {
      await prisma.track.update({
        where: { id: trackId },
        data: { audioRequestedAt: new Date() }
      })
    }
    setResponseStatus(event, 202)
    return { status: 'processing', message: 'Preparing audio — the worker is fetching this track.' }
  }

  // --- Local mode (dev): stream via yt-dlp directly ---
  let filePath: string
  try {
    filePath = await getCachedAudio(videoId)
  } catch (e: any) {
    console.error('[Audio] download failed:', e)
    throw createError({ statusCode: 502, message: e?.message || 'Failed to fetch audio' })
  }
  setHeader(event, 'Content-Type', 'audio/mpeg')
  setHeader(event, 'Content-Length', statSync(filePath).size)
  setHeader(event, 'Accept-Ranges', 'bytes')
  setHeader(event, 'Cache-Control', 'private, max-age=86400')
  return sendStream(event, createReadStream(filePath))
})
