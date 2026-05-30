/**
 * Client-side 401 interceptor.
 * If a session expires mid-use, any API call returning 401 redirects to login
 * instead of failing silently into an empty/loading state.
 */
export default defineNuxtPlugin((nuxtApp) => {
  globalThis.$fetch = globalThis.$fetch.create({
    onResponseError({ response }) {
      if (response?.status === 401) {
        const path = nuxtApp.$router.currentRoute.value.path
        if (!path.startsWith('/auth') && path !== '/') {
          nuxtApp.runWithContext(() => navigateTo('/auth/login'))
        }
      }
    },
  })
})
