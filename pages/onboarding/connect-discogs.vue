<script setup lang="ts">
/**
 * Discogs connection onboarding
 */

const isConnecting = ref(false)

function connectDiscogs() {
  isConnecting.value = true
  // Redirect to OAuth start endpoint
  window.location.href = '/api/discogs/oauth-start'
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="max-w-2xl w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <!-- Icon -->
        <div class="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
        </div>

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-3">Connect your Discogs collection</h1>
          <p class="text-lg text-gray-600">
            Import your vinyl collection and start organizing with a calmer, more visual interface
          </p>
        </div>

        <!-- Benefits -->
        <div class="space-y-4 mb-8">
          <div class="flex items-start">
            <svg class="w-6 h-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <h3 class="font-semibold text-gray-900">Your collection, beautifully organized</h3>
              <p class="text-gray-600">Cover art first, fast search, and personal notes</p>
            </div>
          </div>

          <div class="flex items-start">
            <svg class="w-6 h-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <h3 class="font-semibold text-gray-900">Safe and private</h3>
              <p class="text-gray-600">We only read your collection. We never modify your Discogs data.</p>
            </div>
          </div>

          <div class="flex items-start">
            <svg class="w-6 h-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <h3 class="font-semibold text-gray-900">Create custom shelves</h3>
              <p class="text-gray-600">Group records however you like - no rigid systems</p>
            </div>
          </div>
        </div>

        <!-- Connect Button -->
        <button
          @click="connectDiscogs"
          :disabled="isConnecting"
          class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-lg"
        >
          <span v-if="isConnecting">Connecting...</span>
          <span v-else>Connect with Discogs</span>
        </button>

        <p class="text-center text-sm text-gray-500 mt-4">
          You'll be redirected to Discogs to authorize access
        </p>
      </div>
    </div>
  </div>
</template>
