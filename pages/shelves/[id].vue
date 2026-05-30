<script setup lang="ts">
/**
 * Single shelf view - shows all records on this shelf
 */

const route = useRoute()
const router = useRouter()
const shelfId = route.params.id as string

const shelf = ref<any>(null)
const isLoading = ref(true)
const isDeleting = ref(false)

async function fetchShelf() {
  isLoading.value = true
  try {
    const response = await $fetch(`/api/shelves/${shelfId}`)
    shelf.value = response.shelf
  } catch (error) {
    console.error('Failed to fetch shelf:', error)
    router.push('/shelves')
  } finally {
    isLoading.value = false
  }
}

async function deleteShelf() {
  if (!confirm('Are you sure you want to delete this shelf? Records will not be deleted.')) {
    return
  }

  isDeleting.value = true
  try {
    await $fetch(`/api/shelves/${shelfId}`, {
      method: 'DELETE'
    })
    router.push('/shelves')
  } catch (error) {
    alert('Failed to delete shelf')
    isDeleting.value = false
  }
}

async function removeRecord(recordId: string) {
  try {
    await $fetch(`/api/shelves/${shelfId}/records/${recordId}`, {
      method: 'DELETE'
    })
    await fetchShelf() // Refresh
  } catch (error) {
    alert('Failed to remove record')
  }
}

// DJ Metadata Analysis for this setlist
const isAnalyzing = ref(false)
const analysisJobId = ref<string | null>(null)
const analysisProgress = ref(0)
const analysisStatus = ref<string | null>(null)
let analysisInterval: NodeJS.Timeout | null = null
let analysisFailures = 0

async function analyzeSetlistDJMetadata() {
  if (!shelf.value || shelf.value.placements.length === 0) {
    alert('This setlist is empty. Add some records first!')
    return
  }

  if (!confirm(`Analyze DJ metadata (BPM, key, energy) for ${shelf.value.placements.length} tracks in this setlist? This will take ~${Math.ceil(shelf.value.placements.length * 15 / 60)} minutes.`)) {
    return
  }

  isAnalyzing.value = true
  try {
    // Get all record IDs from this setlist
    const recordIds = shelf.value.placements.map((p: any) => p.userRecord.id)

    const response = await $fetch<{
      jobId: string
      status: string
      totalTracks: number
      message: string
    }>('/api/analysis/start', {
      method: 'POST',
      body: { recordIds }
    })

    analysisJobId.value = response.jobId
    analysisStatus.value = response.status

    // Start polling for progress
    pollAnalysisProgress()
  } catch (error: any) {
    alert(error.data?.message || 'Failed to start DJ metadata analysis')
    isAnalyzing.value = false
  }
}

function stopAnalysisPolling() {
  if (analysisInterval) {
    clearInterval(analysisInterval)
    analysisInterval = null
  }
}

async function pollAnalysisProgress() {
  if (!analysisJobId.value) return
  analysisFailures = 0
  stopAnalysisPolling()

  analysisInterval = setInterval(async () => {
    try {
      const status = await $fetch<{
        jobId: string
        status: string
        progress: number
        processed: number
        failed: number
        errorMessage?: string
      }>(`/api/analysis/${analysisJobId.value}`)
      analysisFailures = 0

      analysisProgress.value = status.progress
      analysisStatus.value = status.status

      if (status.status === 'completed') {
        stopAnalysisPolling()
        isAnalyzing.value = false
        await fetchShelf() // Reload setlist
        analysisJobId.value = null
      } else if (status.status === 'failed') {
        stopAnalysisPolling()
        isAnalyzing.value = false
        analysisJobId.value = null
      }
    } catch (error) {
      if (++analysisFailures >= 3) {
        stopAnalysisPolling()
        isAnalyzing.value = false
      }
    }
  }, 3000) // Poll every 3 seconds
}

onMounted(() => {
  fetchShelf()
})

onUnmounted(stopAnalysisPolling)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[70vh]">
      <div class="w-12 h-12 relative">
        <div class="absolute inset-0 rounded-full border-2 border-white/10"></div>
        <div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style="border-top-color: var(--accent);"></div>
      </div>
    </div>

    <!-- Shelf Content -->
    <div v-else-if="shelf" class="py-8">
      <!-- Header -->
      <div class="mb-8">
        <button @click="router.push('/shelves')" class="btn-ghost mb-5 -ml-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to shelves
        </button>

        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div class="flex items-start gap-3">
            <span class="w-5 h-5 rounded-full flex-shrink-0 mt-2" :style="{ backgroundColor: shelf.color || '#ff4d3d' }"></span>
            <div>
              <h1 class="display text-4xl">{{ shelf.name }}</h1>
              <p v-if="shelf.description" class="mt-2" style="color: var(--text-secondary);">{{ shelf.description }}</p>
              <p class="text-sm mt-1" style="color: var(--text-tertiary);">
                {{ shelf.placements.length }} {{ shelf.placements.length === 1 ? 'record' : 'records' }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="shelf.placements.length > 0"
              @click="analyzeSetlistDJMetadata"
              :disabled="isAnalyzing"
              class="btn-secondary !py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="w-4 h-4" :class="{ 'animate-spin': isAnalyzing }" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
              </svg>
              {{ isAnalyzing ? `Analyzing… ${analysisProgress}%` : 'Analyze DJ data' }}
            </button>
            <button
              @click="deleteShelf"
              :disabled="isDeleting"
              class="btn-ghost text-sm disabled:opacity-50"
              style="color: #ff6b6b;"
            >
              {{ isDeleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="shelf.placements.length === 0" class="text-center py-20">
        <div class="w-20 h-20 surface rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg class="w-9 h-9" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
          </svg>
        </div>
        <h3 class="display text-2xl mb-2">This shelf is empty</h3>
        <p class="mb-6" style="color: var(--text-secondary);">Add records from any record's detail page.</p>
        <NuxtLink to="/collection" class="btn-primary inline-flex">Browse collection</NuxtLink>
      </div>

      <!-- Records Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <div v-for="placement in shelf.placements" :key="placement.id" class="group relative album-glow">
          <NuxtLink :to="`/collection/${placement.userRecord.id}`" class="block">
            <div class="aspect-square rounded-xl overflow-hidden" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle);">
              <img
                v-if="placement.userRecord.release.coverUrl || placement.userRecord.release.thumbUrl"
                :src="placement.userRecord.release.coverUrl || placement.userRecord.release.thumbUrl"
                :alt="placement.userRecord.release.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-12 h-12" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
              </div>
            </div>
            <div class="mt-2.5">
              <p class="text-sm font-semibold truncate group-hover:text-[var(--accent)] transition-colors" style="color: var(--text-primary);">
                {{ placement.userRecord.release.artist || 'Unknown Artist' }}
              </p>
              <p class="text-xs truncate" style="color: var(--text-secondary);">{{ placement.userRecord.release.title }}</p>

              <!-- DJ Metadata -->
              <div v-if="placement.userRecord.bpm || placement.userRecord.key || placement.userRecord.energy" class="flex items-center gap-1 mt-1.5 flex-wrap">
                <span v-if="placement.userRecord.bpm" class="chip !px-1.5 !py-0.5 !text-[10px] font-mono">{{ placement.userRecord.bpm }} BPM</span>
                <span v-if="placement.userRecord.key" class="chip !px-1.5 !py-0.5 !text-[10px] font-mono">{{ placement.userRecord.key }}</span>
                <span v-if="placement.userRecord.energy" class="chip !px-1.5 !py-0.5 !text-[10px] font-mono">E{{ placement.userRecord.energy }}</span>
              </div>
            </div>
          </NuxtLink>

          <!-- Remove Button (appears on hover) -->
          <button
            @click="removeRecord(placement.userRecord.id)"
            class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
            style="background: rgba(11,11,12,0.7); border: 1px solid var(--border-strong); color: #fff;"
            title="Remove from shelf"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
