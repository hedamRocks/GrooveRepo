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

async function pollAnalysisProgress() {
  if (!analysisJobId.value) return

  const interval = setInterval(async () => {
    try {
      const status = await $fetch<{
        jobId: string
        status: string
        progress: number
        processed: number
        failed: number
        errorMessage?: string
      }>(`/api/analysis/${analysisJobId.value}`)

      analysisProgress.value = status.progress
      analysisStatus.value = status.status

      if (status.status === 'completed') {
        clearInterval(interval)
        isAnalyzing.value = false
        alert(`DJ metadata analysis complete! Analyzed ${status.processed} tracks, ${status.failed} failed.`)
        await fetchShelf() // Reload setlist
        analysisJobId.value = null
      } else if (status.status === 'failed') {
        clearInterval(interval)
        isAnalyzing.value = false
        alert(`Analysis failed: ${status.errorMessage}`)
        analysisJobId.value = null
      }
    } catch (error) {
      console.error('Failed to poll analysis status:', error)
    }
  }, 3000) // Poll every 3 seconds
}

onMounted(() => {
  fetchShelf()
})
</script>

<template>
  <div class="min-h-screen" style="background: var(--bg-primary);">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2" style="border-color: var(--neon-blue);"></div>
    </div>

    <!-- Shelf Content -->
    <div v-else-if="shelf" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="router.push('/shelves')"
          class="flex items-center glass-hover mb-4 transition-all duration-200 px-3 py-2"
          style="color: var(--text-secondary);"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to shelves
        </button>

        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-4 h-4 rounded-full flex-shrink-0"
              :style="{ backgroundColor: shelf.color || '#a78bfa' }"
            ></div>
            <div>
              <h1 class="text-3xl font-bold text-gray-900">{{ shelf.name }}</h1>
              <p v-if="shelf.description" class="text-gray-600 mt-1">{{ shelf.description }}</p>
              <p class="text-gray-500 text-sm mt-1">
                {{ shelf.placements.length }} {{ shelf.placements.length === 1 ? 'record' : 'records' }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              v-if="shelf.placements.length > 0"
              @click="analyzeSetlistDJMetadata"
              :disabled="isAnalyzing"
              class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg class="w-4 h-4" :class="{ 'animate-spin': isAnalyzing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
              </svg>
              {{ isAnalyzing ? `Analyzing... ${analysisProgress}%` : 'Analyze DJ Metadata' }}
            </button>
            <button
              @click="deleteShelf"
              :disabled="isDeleting"
              class="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
            >
              {{ isDeleting ? 'Deleting...' : 'Delete Shelf' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="shelf.placements.length === 0" class="text-center py-16">
        <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">This shelf is empty</h3>
        <p class="text-gray-600 mb-6">Add records to this shelf from the record detail page</p>
        <NuxtLink
          to="/collection"
          class="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
        >
          Browse collection
        </NuxtLink>
      </div>

      <!-- Records Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <div
          v-for="placement in shelf.placements"
          :key="placement.id"
          class="group relative"
        >
          <NuxtLink
            :to="`/collection/${placement.userRecord.id}`"
            class="block"
          >
            <div class="aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
              <img
                v-if="placement.userRecord.release.coverUrl || placement.userRecord.release.thumbUrl"
                :src="placement.userRecord.release.coverUrl || placement.userRecord.release.thumbUrl"
                :alt="placement.userRecord.release.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
                <svg class="w-16 h-16 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
              </div>
            </div>
            <div class="mt-2">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ placement.userRecord.release.artist || 'Unknown Artist' }}
              </p>
              <p class="text-xs text-gray-600 truncate">{{ placement.userRecord.release.title }}</p>

              <!-- DJ Metadata -->
              <div v-if="placement.userRecord.bpm || placement.userRecord.key || placement.userRecord.energy" class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span v-if="placement.userRecord.bpm" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-100 text-purple-700 border border-purple-200">
                  <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {{ placement.userRecord.bpm }}
                </span>
                <span v-if="placement.userRecord.key" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-100 text-cyan-700 border border-cyan-200">
                  <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                  {{ placement.userRecord.key }}
                </span>
                <span v-if="placement.userRecord.energy" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-pink-100 text-pink-700 border border-pink-200">
                  <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.48 2.54l2.6 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.06-4.09l-2.6-1.53C16.17 17.98 14.21 19 12 19z"/>
                  </svg>
                  {{ placement.userRecord.energy }}/10
                </span>
              </div>
            </div>
          </NuxtLink>

          <!-- Remove Button (appears on hover) -->
          <button
            @click="removeRecord(placement.userRecord.id)"
            class="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-700"
            title="Remove from shelf"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
