<script setup lang="ts">
/**
 * Magic link verification page
 * User lands here after clicking email link
 */

const route = useRoute()
const token = route.query.token as string

const isVerifying = ref(true)
const error = ref('')

onMounted(async () => {
  if (!token) {
    error.value = 'Invalid verification link'
    isVerifying.value = false
    return
  }

  try {
    const response = await $fetch('/api/auth/verify-magic-link', {
      method: 'POST',
      body: { token }
    })

    // Verification successful - redirect based on user state
    if (response.user.discogsConnected) {
      // User has already connected Discogs
      navigateTo('/collection')
    } else {
      // First time user - go to onboarding
      navigateTo('/onboarding/connect-discogs')
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Verification failed. Please try again.'
    isVerifying.value = false
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-primary);">
    <div class="max-w-md w-full">
      <div class="glass p-8 text-center" style="background: var(--bg-secondary); box-shadow: var(--shadow-glass);">
        <!-- Verifying State -->
        <div v-if="isVerifying">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style="border-color: var(--neon-blue);"></div>
          <h2 class="text-2xl font-semibold mb-2" style="color: var(--text-primary);">Verifying...</h2>
          <p style="color: var(--text-secondary);">Please wait while we sign you in</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error">
          <div class="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4" style="background: var(--bg-glass);">
            <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-semibold mb-2" style="color: var(--text-primary);">Verification Failed</h2>
          <p class="mb-6" style="color: var(--text-secondary);">{{ error }}</p>
          <NuxtLink
            to="/auth/login"
            class="btn-primary inline-block py-3 px-6"
          >
            Back to login
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
