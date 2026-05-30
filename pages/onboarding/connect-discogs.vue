<script setup lang="ts">
/**
 * Discogs connection onboarding
 */
definePageMeta({ layout: 'blank' })

const isConnecting = ref(false)

function connectDiscogs() {
  isConnecting.value = true
  // Redirect to OAuth start endpoint
  window.location.href = '/api/discogs/oauth-start'
}

const benefits = [
  { title: 'Your collection, beautifully organized', body: 'Cover art first, fast search, and personal notes.' },
  { title: 'Safe and private', body: 'We only read your collection. We never modify your Discogs data.' },
  { title: 'Create custom shelves', body: 'Group records however you like — no rigid systems.' },
]
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-grain" style="background: var(--bg-primary);">
    <div class="max-w-xl w-full">
      <!-- Wordmark -->
      <div class="flex items-center justify-center gap-2 mb-8">
        <span class="w-3 h-3 rounded-full" style="background: var(--accent);"></span>
        <span class="font-display font-bold text-xl">GrooveRepo</span>
      </div>

      <div class="surface p-8 md:p-10 scale-in" style="box-shadow: var(--shadow-lg);">
        <!-- Icon -->
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style="background: var(--accent-soft); border: 1px solid var(--border-subtle);">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--accent);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
        </div>

        <!-- Header -->
        <div class="text-center mb-8">
          <p class="eyebrow mb-3">Step 1 of 2</p>
          <h1 class="display text-3xl mb-3">Connect your Discogs collection</h1>
          <p class="text-base" style="color: var(--text-secondary);">
            Import your vinyl and start organizing with a calmer, more visual interface.
          </p>
        </div>

        <!-- Benefits -->
        <div class="space-y-3 mb-8">
          <div v-for="b in benefits" :key="b.title" class="flex items-start gap-3 surface-2 p-4">
            <span class="w-6 h-6 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0" style="background: var(--accent-soft);">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--accent);">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </span>
            <div>
              <h3 class="font-semibold text-sm" style="color: var(--text-primary);">{{ b.title }}</h3>
              <p class="text-sm mt-0.5" style="color: var(--text-secondary);">{{ b.body }}</p>
            </div>
          </div>
        </div>

        <!-- Connect Button -->
        <button
          @click="connectDiscogs"
          :disabled="isConnecting"
          class="btn-primary w-full text-base"
        >
          <span v-if="isConnecting">Connecting…</span>
          <span v-else>Connect with Discogs</span>
        </button>

        <p class="text-center text-sm mt-4" style="color: var(--text-tertiary);">
          You'll be redirected to Discogs to authorize access.
        </p>
      </div>
    </div>
  </div>
</template>
