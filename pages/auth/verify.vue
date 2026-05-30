<script setup lang="ts">
/**
 * Magic link verification page
 * User lands here after clicking email link
 */
definePageMeta({ layout: 'blank' })

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
  <div class="min-h-screen flex items-center justify-center p-4 bg-grain" style="background: var(--bg-primary);">
    <div class="max-w-md w-full">
      <div class="surface p-10 text-center" style="box-shadow: var(--shadow-md);">
        <!-- Verifying State -->
        <div v-if="isVerifying">
          <div class="relative mx-auto mb-6 w-14 h-14">
            <div class="absolute inset-0 rounded-full border-2 border-white/10"></div>
            <div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style="border-top-color: var(--accent);"></div>
          </div>
          <h2 class="display text-2xl mb-2">Signing you in…</h2>
          <p style="color: var(--text-secondary);">Hang tight for a moment</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style="background: rgba(255,77,61,0.1); border: 1px solid var(--border-subtle);">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--accent);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 class="display text-2xl mb-2">Verification failed</h2>
          <p class="mb-7" style="color: var(--text-secondary);">{{ error }}</p>
          <NuxtLink to="/auth/login" class="btn-primary inline-flex">
            Back to login
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
