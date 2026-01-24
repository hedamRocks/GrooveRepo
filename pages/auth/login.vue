<script setup lang="ts">
/**
 * Email-based magic link login
 */

const email = ref('')
const isLoading = ref(false)
const message = ref('')
const isSuccess = ref(false)

async function sendMagicLink() {
  if (!email.value) return

  isLoading.value = true
  message.value = ''

  try {
    const response = await $fetch('/api/auth/send-magic-link', {
      method: 'POST',
      body: { email: email.value }
    })

    isSuccess.value = true
    message.value = response.message || 'Check your email for a sign-in link'
  } catch (error: any) {
    isSuccess.value = false
    message.value = error.data?.message || 'Failed to send magic link. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-primary);">
    <div class="max-w-md w-full">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold gradient-text mb-2">Welcome</h1>
        <p style="color: var(--text-secondary);">Your visual vinyl collection</p>
      </div>

      <!-- Login Card -->
      <div class="glass p-8" style="background: var(--bg-secondary); box-shadow: var(--shadow-glass);">
        <div v-if="!isSuccess">
          <h2 class="text-2xl font-semibold mb-2" style="color: var(--text-primary);">Sign in</h2>
          <p class="mb-6" style="color: var(--text-secondary);">Enter your email to receive a magic link</p>

          <form @submit.prevent="sendMagicLink" class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                Email address
              </label>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="w-full px-4 py-3 border glass-input transition-all duration-200 outline-none"
                style="background: var(--bg-tertiary); border-color: var(--border-glass); color: var(--text-primary);"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              :disabled="isLoading || !email"
              class="btn-primary w-full py-3 font-semibold"
              :class="{ 'opacity-50 cursor-not-allowed': isLoading || !email }"
            >
              <span v-if="isLoading">Sending...</span>
              <span v-else>Send magic link</span>
            </button>
          </form>

          <p v-if="message && !isSuccess" class="mt-4 text-sm text-red-400">
            {{ message }}
          </p>
        </div>

        <!-- Success State -->
        <div v-else class="text-center py-4">
          <div class="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4" style="background: var(--bg-glass);">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--neon-green);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2" style="color: var(--text-primary);">Check your email</h3>
          <p class="mb-4" style="color: var(--text-secondary);">{{ message }}</p>
          <p class="text-sm" style="color: var(--text-tertiary);">The link will expire in 15 minutes</p>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-sm mt-6" style="color: var(--text-secondary);">
        No passwords. No tracking. Just your collection.
      </p>
    </div>
  </div>
</template>
