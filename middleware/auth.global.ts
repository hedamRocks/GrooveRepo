/**
 * Global auth guard.
 * Public routes are reachable without a session; everything else requires one.
 * On a missing/expired session we bounce to the login page instead of letting
 * the page render with chrome and silently-failing fetches.
 */
const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/verify']

export default defineNuxtRouteMiddleware(async (to) => {
  if (PUBLIC_ROUTES.includes(to.path)) return

  try {
    // Forward the cookie on SSR so the session is visible server-side too.
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    await $fetch('/api/auth/me', { headers })
  } catch (err) {
    return navigateTo('/auth/login')
  }
})
