<script setup lang="ts">
/**
 * Import progress screen
 * Polls import job status and shows progress
 */

const router = useRouter()
const jobId = ref<string | null>(null)
const status = ref<string>('pending')
const progress = ref(0)
const processedItems = ref(0)
const totalItems = ref(0)
const errorMessage = ref('')

let pollInterval: NodeJS.Timeout | null = null

onMounted(async () => {
  // Start import if not already running
  try {
    const response = await $fetch('/api/import/start', {
      method: 'POST'
    })
    jobId.value = response.jobId
    startPolling()
  } catch (error: any) {
    errorMessage.value = error.data?.message || 'Failed to start import'
  }
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})

function startPolling() {
  if (!jobId.value) return

  // Poll every 2 seconds
  pollInterval = setInterval(async () => {
    try {
      const response = await $fetch(`/api/import/${jobId.value}`)

      status.value = response.status
      progress.value = response.progress
      processedItems.value = response.processedItems
      totalItems.value = response.totalItems || 0

      // Stop polling if completed or failed
      if (response.status === 'completed') {
        if (pollInterval) clearInterval(pollInterval)
        // Wait a moment then redirect
        setTimeout(() => {
          router.push('/collection')
        }, 1500)
      } else if (response.status === 'failed') {
        if (pollInterval) clearInterval(pollInterval)
        errorMessage.value = response.errorMessage || 'Import failed'
      }
    } catch (error: any) {
      console.error('Polling error:', error)
    }
  }, 2000)
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-primary);">
    <div class="max-w-2xl w-full">
      <div class="glass p-8 md:p-12" style="background: var(--bg-secondary); box-shadow: var(--shadow-glass);">
        <!-- Success State -->
        <div v-if="status === 'completed'" class="text-center">
          <div class="w-20 h-20 glass rounded-full flex items-center justify-center mx-auto mb-6" style="background: var(--bg-glass);">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--neon-green);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 class="text-3xl font-bold gradient-text mb-3">Import complete!</h1>
          <p class="text-lg mb-4" style="color: var(--text-secondary);">
            Imported {{ totalItems }} records from your Discogs collection
          </p>
          <p style="color: var(--text-tertiary);">Redirecting to your collection...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="status === 'failed'" class="text-center">
          <div class="w-20 h-20 glass rounded-full flex items-center justify-center mx-auto mb-6" style="background: var(--bg-glass);">
            <svg class="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1 class="text-3xl font-bold gradient-text mb-3">Import failed</h1>
          <p class="text-lg mb-6" style="color: var(--text-secondary);">{{ errorMessage }}</p>
          <button
            @click="router.push('/onboarding/connect-discogs')"
            class="btn-primary py-3 px-6"
          >
            Try again
          </button>
        </div>

        <!-- Loading State -->
        <div v-else class="text-center">
          <!-- Vinyl Record Animation -->
          <div class="w-24 h-24 mx-auto mb-8 relative">
            <div class="absolute inset-0 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full animate-spin" style="animation-duration: 2s;"></div>
            <div class="absolute inset-4 bg-white rounded-full"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full"></div>
            </div>
          </div>

          <h1 class="text-3xl font-bold text-gray-900 mb-3">
            Importing your collection
          </h1>
          <p class="text-lg text-gray-600 mb-8">
            This may take a few minutes depending on your collection size
          </p>

          <!-- Progress Bar -->
          <div class="mb-6">
            <div class="flex justify-between text-sm text-gray-600 mb-2">
              <span>{{ processedItems }} / {{ totalItems || '...' }} records</span>
              <span>{{ progress }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                class="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
                :style="{ width: `${progress}%` }"
              ></div>
            </div>
          </div>

          <!-- Status Messages -->
          <div class="text-sm text-gray-500 space-y-2">
            <p v-if="status === 'pending'">Starting import...</p>
            <p v-else-if="status === 'in_progress'">
              Fetching records from Discogs...
            </p>
          </div>

          <!-- Info Box -->
          <div class="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-4 text-left">
            <p class="text-sm text-gray-700">
              <span class="font-semibold">Why does this take time?</span><br>
              We respect Discogs' API rate limits to ensure reliable service for everyone.
              Your collection is being imported safely in the background.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
