<script setup lang="ts">
/**
 * Import progress screen
 * Polls import job status and shows progress
 */
definePageMeta({ layout: 'blank' })

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
  <div class="min-h-screen flex items-center justify-center p-4 bg-grain" style="background: var(--bg-primary);">
    <div class="max-w-xl w-full">
      <div class="surface p-8 md:p-12" style="box-shadow: var(--shadow-lg);">
        <!-- Success State -->
        <div v-if="status === 'completed'" class="text-center scale-in">
          <div class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style="background: var(--accent-soft); border: 1px solid var(--border-subtle);">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--accent);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 class="display text-3xl mb-3">Import complete</h1>
          <p class="text-lg mb-4" style="color: var(--text-secondary);">
            Imported {{ totalItems }} records from your Discogs collection.
          </p>
          <p style="color: var(--text-tertiary);">Redirecting to your collection…</p>
        </div>

        <!-- Error State -->
        <div v-else-if="status === 'failed'" class="text-center">
          <div class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style="background: rgba(255,77,61,0.1); border: 1px solid var(--border-subtle);">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--accent);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1 class="display text-3xl mb-3">Import failed</h1>
          <p class="text-lg mb-6" style="color: var(--text-secondary);">{{ errorMessage }}</p>
          <button @click="router.push('/onboarding/connect-discogs')" class="btn-primary">
            Try again
          </button>
        </div>

        <!-- Loading State -->
        <div v-else class="text-center">
          <!-- Vinyl Record Animation -->
          <div class="w-24 h-24 mx-auto mb-8 relative">
            <div class="absolute inset-0 rounded-full animate-spin" style="animation-duration: 2.4s; background: conic-gradient(from 0deg, #1f1f22, #2a2a2e, #1f1f22);"></div>
            <div class="absolute inset-[6px] rounded-full" style="background: #0b0b0c; border: 1px solid var(--border-subtle);"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="w-7 h-7 rounded-full" style="background: var(--accent);"></div>
            </div>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-black"></div>
            </div>
          </div>

          <p class="eyebrow mb-3">Step 2 of 2</p>
          <h1 class="display text-3xl mb-3">Importing your collection</h1>
          <p class="text-base mb-8" style="color: var(--text-secondary);">
            This may take a few minutes depending on your collection size.
          </p>

          <!-- Progress Bar -->
          <div class="mb-6">
            <div class="flex justify-between text-sm mb-2 font-mono" style="color: var(--text-secondary);">
              <span>{{ processedItems }} / {{ totalItems || '…' }} records</span>
              <span style="color: var(--accent);">{{ progress }}%</span>
            </div>
            <div class="w-full h-2.5 rounded-full overflow-hidden" style="background: var(--bg-tertiary);">
              <div
                class="h-full rounded-full transition-all duration-500"
                style="background: var(--accent);"
                :style="{ width: `${progress}%` }"
              ></div>
            </div>
          </div>

          <!-- Status Messages -->
          <div class="text-sm" style="color: var(--text-tertiary);">
            <p v-if="status === 'pending'">Starting import…</p>
            <p v-else-if="status === 'in_progress'">Fetching records from Discogs…</p>
          </div>

          <!-- Info Box -->
          <div class="mt-8 surface-2 p-4 text-left">
            <p class="text-sm" style="color: var(--text-secondary);">
              <span class="font-semibold" style="color: var(--text-primary);">Why does this take time?</span><br>
              We respect Discogs' API rate limits to ensure reliable service for everyone. Your collection is imported safely in the background.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
