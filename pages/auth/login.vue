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
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">Welcome</h1>
        <p class="text-gray-600">Your visual vinyl collection</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div v-if="!isSuccess">
          <h2 class="text-2xl font-semibold text-gray-900 mb-2">Sign in</h2>
          <p class="text-gray-600 mb-6">Enter your email to receive a magic link</p>

          <form @submit.prevent="sendMagicLink" class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              :disabled="isLoading || !email"
              class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <span v-if="isLoading">Sending...</span>
              <span v-else>Send magic link</span>
            </button>
          </form>

          <p v-if="message && !isSuccess" class="mt-4 text-sm text-red-600">
            {{ message }}
          </p>
        </div>

        <!-- Success State -->
        <div v-else class="text-center py-4">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Check your email</h3>
          <p class="text-gray-600 mb-4">{{ message }}</p>
          <p class="text-sm text-gray-500">The link will expire in 15 minutes</p>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-sm text-gray-600 mt-6">
        No passwords. No tracking. Just your collection.
      </p>
    </div>
  </div>
</template>
