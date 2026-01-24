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
  <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-primary);">
    <div class="max-w-2xl w-full">
      <div class="glass p-8 md:p-12" style="background: var(--bg-secondary); box-shadow: var(--shadow-glass);">
        <!-- Icon -->
        <div class="w-20 h-20 glass rounded-full flex items-center justify-center mx-auto mb-6" style="background: var(--bg-glass);">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--neon-blue);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
        </div>

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold gradient-text mb-3">Connect your Discogs collection</h1>
          <p class="text-lg" style="color: var(--text-secondary);">
            Import your vinyl collection and start organizing with a calmer, more visual interface
          </p>
        </div>

        <!-- Benefits -->
        <div class="space-y-4 mb-8">
          <div class="flex items-start">
            <svg class="w-6 h-6 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--neon-green);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <h3 class="font-semibold" style="color: var(--text-primary);">Your collection, beautifully organized</h3>
              <p style="color: var(--text-secondary);">Cover art first, fast search, and personal notes</p>
            </div>
          </div>

          <div class="flex items-start">
            <svg class="w-6 h-6 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--neon-green);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <h3 class="font-semibold" style="color: var(--text-primary);">Safe and private</h3>
              <p style="color: var(--text-secondary);">We only read your collection. We never modify your Discogs data.</p>
            </div>
          </div>

          <div class="flex items-start">
            <svg class="w-6 h-6 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--neon-green);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <h3 class="font-semibold" style="color: var(--text-primary);">Create custom shelves</h3>
              <p style="color: var(--text-secondary);">Group records however you like - no rigid systems</p>
            </div>
          </div>
        </div>

        <!-- Connect Button -->
        <button
          @click="connectDiscogs"
          :disabled="isConnecting"
          class="btn-primary w-full py-4 text-lg font-semibold transition-all duration-300"
          :class="{ 'opacity-50 cursor-not-allowed': isConnecting }"
        >
          <span v-if="isConnecting">Connecting...</span>
          <span v-else>Connect with Discogs</span>
        </button>

        <p class="text-center text-sm mt-4" style="color: var(--text-tertiary);">
          You'll be redirected to Discogs to authorize access
        </p>
      </div>
    </div>
  </div>
</template>
