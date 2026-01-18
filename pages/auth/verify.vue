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
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <!-- Verifying State -->
        <div v-if="isVerifying">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-2">Verifying...</h2>
          <p class="text-gray-600">Please wait while we sign you in</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
          <p class="text-gray-600 mb-6">{{ error }}</p>
          <NuxtLink
            to="/auth/login"
            class="inline-block bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition"
          >
            Back to login
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
