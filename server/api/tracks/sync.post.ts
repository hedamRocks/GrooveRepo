/**
 * Sync tracks from Release.discogsData for user's records
 * Populates Track table from tracklist data
 */

import { syncAllTracks } from '~/server/utils/track-sync'

export default defineEventHandler(async (event) => {
  try {
    // Get current user
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

    console.log(`[Track Sync API] Starting track sync for user ${user.id}`)

    // Sync tracks
    const result = await syncAllTracks(user.id)

    return {
      success: true,
      synced: result.synced,
      failed: result.failed,
      message: `Synced ${result.synced} records (${result.failed} failed)`
    }

  } catch (error) {
    console.error('[Track Sync API] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to sync tracks'
    })
  }
})
