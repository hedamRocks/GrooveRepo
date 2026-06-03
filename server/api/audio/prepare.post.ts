/**
 * Pre-warm the audio cache for a set of tracks: flag the ones that already
 * have a resolved youtubeId and aren't cached yet, so the worker downloads +
 * uploads them to R2 in the background. By the time the user hits play, the
 * audio is ready and streams instantly.
 *
 * Only flags tracks that already have a youtubeId (no YouTube API search here),
 * so pre-warming never spends search quota. No-op when R2 isn't configured.
 */

import { r2Configured } from '~/server/utils/r2'

export default defineEventHandler(async (event) => {
  const userEmail = getCookie(event, 'user_email')
  if (!userEmail) throw createError({ statusCode: 401, message: 'Authentication required' })

  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user) throw createError({ statusCode: 404, message: 'User not found' })

  if (!r2Configured()) return { queued: 0, skipped: 'r2-not-configured' }

  const body = await readBody(event)
  const trackIds: string[] = Array.isArray(body?.trackIds) ? body.trackIds : []
  if (trackIds.length === 0) return { queued: 0 }

  const result = await prisma.track.updateMany({
    where: {
      id: { in: trackIds },
      userRecord: { userId: user.id },
      youtubeId: { not: null },
      audioReady: false,
    },
    data: { audioRequestedAt: new Date() },
  })

  return { queued: result.count }
})
