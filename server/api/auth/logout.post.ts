/**
 * Log out current user
 * Clears session cookies
 */

export default defineEventHandler(async (event) => {
  deleteCookie(event, 'user_email')
  deleteCookie(event, 'user_id')
  deleteCookie(event, 'discogs_request_secret')

  return {
    success: true,
    message: 'Logged out'
  }
})
