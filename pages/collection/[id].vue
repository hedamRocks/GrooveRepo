<script setup lang="ts">
/**
 * Record detail page - view metadata and add notes
 */

const route = useRoute()
const router = useRouter()
const recordId = route.params.id as string

const record = ref<any>(null)
const notes = ref('')
const isLoadingRecord = ref(true)
const isSavingNotes = ref(false)
const saveMessage = ref('')

// Condition tracking
const mediaCondition = ref('')
const sleeveCondition = ref('')
const conditionOptions = [
  'Mint (M)',
  'Near Mint (NM or M-)',
  'Very Good Plus (VG+)',
  'Very Good (VG)',
  'Good Plus (G+)',
  'Good (G)',
  'Fair (F)',
  'Poor (P)'
]

// Shelf management
const shelves = ref<any[]>([])
const isAddingToShelf = ref(false)
const selectedShelfId = ref('')

// Fetch record
async function fetchRecord() {
  isLoadingRecord.value = true
  try {
    const response = await $fetch(`/api/records/${recordId}`)
    record.value = response.record
    notes.value = response.record.notes || ''
    mediaCondition.value = response.record.mediaCondition || ''
    sleeveCondition.value = response.record.sleeveCondition || ''
  } catch (error) {
    console.error('Failed to fetch record:', error)
    router.push('/collection')
  } finally {
    isLoadingRecord.value = false
  }
}

// Fetch shelves
async function fetchShelves() {
  try {
    const response = await $fetch('/api/shelves')
    shelves.value = response.shelves
  } catch (error) {
    console.error('Failed to fetch shelves:', error)
  }
}

// Save notes and conditions
async function saveNotes() {
  isSavingNotes.value = true
  saveMessage.value = ''

  try {
    await $fetch(`/api/records/${recordId}`, {
      method: 'PATCH',
      body: {
        notes: notes.value,
        mediaCondition: mediaCondition.value || null,
        sleeveCondition: sleeveCondition.value || null
      }
    })
    saveMessage.value = 'Saved successfully'
    setTimeout(() => {
      saveMessage.value = ''
    }, 2000)
  } catch (error) {
    saveMessage.value = 'Failed to save'
  } finally {
    isSavingNotes.value = false
  }
}

// Add to shelf
async function addToShelf() {
  if (!selectedShelfId.value) return

  isAddingToShelf.value = true
  try {
    await $fetch(`/api/shelves/${selectedShelfId.value}/records/${recordId}`, {
      method: 'POST'
    })
    await fetchRecord() // Refresh to show new shelf
    selectedShelfId.value = ''
  } catch (error: any) {
    alert(error.data?.message || 'Failed to add to shelf')
  } finally {
    isAddingToShelf.value = false
  }
}

// Remove from shelf
async function removeFromShelf(shelfId: string) {
  try {
    await $fetch(`/api/shelves/${shelfId}/records/${recordId}`, {
      method: 'DELETE'
    })
    await fetchRecord() // Refresh to remove shelf
  } catch (error) {
    alert('Failed to remove from shelf')
  }
}

// Track analysis
const isAnalyzingTracks = ref(false)
const analyzingTrackId = ref<string | null>(null)
const analysisJobId = ref<string | null>(null)
const analysisProgress = ref(0)

// Track editing
const editingTrackId = ref<string | null>(null)
const editingBpm = ref<number | null>(null)

function startEditBpm(track: any) {
  editingTrackId.value = track.id
  editingBpm.value = track.bpm
}

async function saveTrackBpm(trackId: string) {
  if (!editingBpm.value) return

  try {
    await $fetch(`/api/tracks/${trackId}/metadata`, {
      method: 'PATCH',
      body: { bpm: editingBpm.value }
    })

    // Refresh record to show updated BPM
    await fetchRecord()

    // Clear editing state
    editingTrackId.value = null
    editingBpm.value = null
  } catch (error: any) {
    alert(error.data?.message || 'Failed to update BPM')
  }
}

function cancelEditBpm() {
  editingTrackId.value = null
  editingBpm.value = null
}

async function analyzeAllTracks() {
  if (!record.value?.tracks?.length) return

  if (!confirm(`Analyze DJ metadata (BPM, key, energy) for all ${record.value.tracks.length} tracks? This will take ~${Math.ceil(record.value.tracks.length * 15 / 60)} minutes.`)) {
    return
  }

  isAnalyzingTracks.value = true
  try {
    const trackIds = record.value.tracks.map((t: any) => t.id)

    const response = await $fetch<{
      jobId: string
      status: string
      totalTracks: number
    }>('/api/analysis/start', {
      method: 'POST',
      body: { trackIds }
    })

    analysisJobId.value = response.jobId

    // Start polling for progress
    pollAnalysisProgress()
  } catch (error: any) {
    alert(error.data?.message || 'Failed to start track analysis')
    isAnalyzingTracks.value = false
  }
}

async function analyzeSingleTrack(trackId: string) {
  analyzingTrackId.value = trackId
  try {
    const response = await $fetch<{
      jobId: string
      status: string
    }>('/api/analysis/start', {
      method: 'POST',
      body: { trackIds: [trackId] }
    })

    analysisJobId.value = response.jobId
    pollAnalysisProgress()
  } catch (error: any) {
    alert(error.data?.message || 'Failed to start track analysis')
    analyzingTrackId.value = null
  }
}

async function pollAnalysisProgress() {
  if (!analysisJobId.value) return

  const interval = setInterval(async () => {
    try {
      const status = await $fetch<{
        status: string
        progress: number
        processed: number
        failed: number
        errorMessage?: string
      }>(`/api/analysis/${analysisJobId.value}`)

      analysisProgress.value = status.progress

      if (status.status === 'completed') {
        clearInterval(interval)
        isAnalyzingTracks.value = false
        analyzingTrackId.value = null
        await fetchRecord() // Reload to show updated metadata
        analysisJobId.value = null
        alert(`Analysis complete! ${status.processed} tracks analyzed, ${status.failed} failed.`)
      } else if (status.status === 'failed') {
        clearInterval(interval)
        isAnalyzingTracks.value = false
        analyzingTrackId.value = null
        alert(`Analysis failed: ${status.errorMessage}`)
        analysisJobId.value = null
      }
    } catch (error) {
      console.error('Failed to poll analysis status:', error)
    }
  }, 3000) // Poll every 3 seconds
}

onMounted(() => {
  fetchRecord()
  fetchShelves()
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Loading State -->
    <div v-if="isLoadingRecord" class="flex items-center justify-center min-h-screen morphing-bg">
      <div class="text-center">
        <div class="relative mb-6">
          <div class="w-16 h-16 mx-auto">
            <div class="absolute inset-0 border-2 border-white/20"></div>
            <div class="absolute inset-0 border-2 border-transparent border-t-white animate-spin"></div>
          </div>
        </div>
        <p class="text-white font-mono text-sm">Loading record...</p>
      </div>
    </div>

    <!-- Record Detail -->
    <div v-else-if="record" class="max-w-7xl mx-auto px-6 lg:px-8 py-8 animate-fade-in">
      <!-- Back Button -->
      <button
        @click="router.back()"
        class="flex items-center text-gray-500 hover:text-gray-900 mb-8 transition-all duration-300 hover-lift group"
      >
        <div class="w-8 h-8 flex items-center justify-center border border-gray-200 group-hover:border-gray-400 mr-3 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
          </svg>
        </div>
        <span class="font-medium">Back to collection</span>
      </button>

      <div class="bg-white shadow-organic overflow-hidden border border-gray-100">
        <div class="lg:flex">
          <!-- Cover Art -->
          <div class="lg:w-1/2 xl:w-2/5">
            <div class="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative group">
              <img
                v-if="record.release.coverUrl"
                :src="record.release.coverUrl"
                :alt="record.release.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
                <svg class="w-32 h-32 text-purple-300 floating" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
              </div>
              <!-- Overlay with play button -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div class="w-16 h-16 bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Metadata & Notes -->
          <div class="lg:w-1/2 xl:w-3/5 p-8 lg:p-12">
            <!-- Title & Artist -->
            <div class="mb-8 animate-slide-up">
              <h1 class="text-4xl lg:text-5xl font-bold gradient-text mb-3 leading-tight">
                {{ record.release.title }}
              </h1>
              <p class="text-xl lg:text-2xl text-gray-600 font-medium">
                {{ record.release.artist || 'Unknown Artist' }}
              </p>
              <div class="flex items-center gap-3 mt-4">
                <div class="h-0.5 w-12 bg-organic"></div>
                <span class="text-sm font-mono text-gray-500">RECORD DETAILS</span>
              </div>
            </div>

            <!-- Metadata Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-100 animate-slide-up" style="animation-delay: 0.1s;">
              <div v-if="record.release.label" class="group">
                <p class="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Label</p>
                <p class="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{{ record.release.label }}</p>
              </div>
              <div v-if="record.release.catNo" class="group">
                <p class="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Catalog #</p>
                <p class="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{{ record.release.catNo }}</p>
              </div>
              <div v-if="record.release.year" class="group">
                <p class="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Year</p>
                <p class="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{{ record.release.year }}</p>
              </div>
              <div v-if="record.release.country" class="group">
                <p class="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Country</p>
                <p class="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{{ record.release.country }}</p>
              </div>
              <div v-if="record.release.formats?.length" class="group">
                <p class="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Format</p>
                <p class="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{{ record.release.formats.join(', ') }}</p>
              </div>
              <div v-if="record.release.genres?.length" class="group">
                <p class="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Genres</p>
                <p class="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{{ record.release.genres.join(', ') }}</p>
              </div>
              <div v-if="record.release.styles?.length" class="group sm:col-span-2">
                <p class="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Styles</p>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="style in record.release.styles" 
                    :key="style"
                    class="px-3 py-1 bg-gray-100 hover:bg-purple-100 text-sm font-medium text-gray-700 hover:text-purple-700 transition-colors border border-gray-200 hover:border-purple-200"
                  >
                    {{ style }}
                  </span>
                </div>
              </div>
              <div v-if="record.release.communityHave" class="group">
                <p class="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">Community Have</p>
                <p class="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">{{ record.release.communityHave.toLocaleString() }}</p>
              </div>
              <div v-if="record.release.communityWant">
                <p class="text-sm text-gray-500">Want</p>
                <p class="font-medium text-gray-900">{{ record.release.communityWant.toLocaleString() }}</p>
              </div>
            </div>

            <!-- Condition Tracking -->
            <div class="mb-8 pb-8 border-b border-gray-200">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Condition</h3>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm text-gray-600 mb-2">Media Condition</label>
                  <select
                    v-model="mediaCondition"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">Not graded</option>
                    <option v-for="option in conditionOptions" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-2">Sleeve Condition</label>
                  <select
                    v-model="sleeveCondition"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">Not graded</option>
                    <option v-for="option in conditionOptions" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Tracklist -->
            <div v-if="record.tracks?.length" class="mb-8 pb-8 border-b border-gray-200 animate-slide-up" style="animation-delay: 0.2s;">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-semibold text-gray-700">Tracklist</h3>
                <button
                  @click="analyzeAllTracks"
                  :disabled="isAnalyzingTracks"
                  class="text-xs text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isAnalyzingTracks ? `Analyzing... ${analysisProgress}%` : 'Analyze All Tracks' }}
                </button>
              </div>
              <div class="space-y-1">
                <div
                  v-for="track in record.tracks"
                  :key="track.id"
                  class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <!-- Position -->
                  <span class="text-gray-500 font-mono text-xs w-8 flex-shrink-0 font-semibold">
                    {{ track.position }}
                  </span>

                  <!-- Title & Duration -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-900 truncate font-medium">{{ track.title }}</p>
                    <p v-if="track.duration" class="text-xs text-gray-500">{{ track.duration }}</p>
                  </div>

                  <!-- DJ Metadata -->
                  <div class="flex items-center gap-2">
                    <!-- BPM - editable -->
                    <div v-if="track.bpm" class="inline-flex items-center gap-1">
                      <div v-if="editingTrackId === track.id" class="flex items-center gap-1">
                        <input
                          v-model.number="editingBpm"
                          type="number"
                          min="20"
                          max="300"
                          class="w-16 px-2 py-1 text-xs font-mono border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          @keyup.enter="saveTrackBpm(track.id)"
                          @keyup.esc="cancelEditBpm"
                        />
                        <button
                          @click="saveTrackBpm(track.id)"
                          class="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          ✓
                        </button>
                        <button
                          @click="cancelEditBpm"
                          class="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          ✕
                        </button>
                      </div>
                      <span
                        v-else
                        @click="startEditBpm(track)"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer hover:bg-purple-200 transition-colors"
                        title="Click to edit BPM"
                      >
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        {{ track.bpm }}
                      </span>
                    </div>
                    <span v-if="track.key" class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-cyan-100 text-cyan-700 border border-cyan-200">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                      {{ track.key }}
                    </span>
                    <span v-if="track.energy" class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-pink-100 text-pink-700 border border-pink-200">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.48 2.54l2.6 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.06-4.09l-2.6-1.53C16.17 17.98 14.21 19 12 19z"/>
                      </svg>
                      {{ track.energy }}/10
                    </span>
                    <button
                      v-if="!track.bpm"
                      @click="analyzeSingleTrack(track.id)"
                      :disabled="analyzingTrackId === track.id"
                      class="opacity-0 group-hover:opacity-100 text-xs text-purple-600 hover:text-purple-700 font-medium transition-opacity disabled:opacity-50"
                    >
                      {{ analyzingTrackId === track.id ? 'Analyzing...' : 'Analyze' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Shelves -->
            <div class="mb-8">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">On Shelves</h3>
              <div v-if="record.shelfPlacements.length > 0" class="flex flex-wrap gap-2 mb-3">
                <div
                  v-for="placement in record.shelfPlacements"
                  :key="placement.id"
                  class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                  :style="{ backgroundColor: placement.shelf.color || '#e5e7eb' }"
                >
                  <span>{{ placement.shelf.name }}</span>
                  <button
                    @click="removeFromShelf(placement.shelf.id)"
                    class="hover:opacity-70"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Add to Shelf -->
              <div class="flex gap-2">
                <select
                  v-model="selectedShelfId"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="">Add to shelf...</option>
                  <option
                    v-for="shelf in shelves"
                    :key="shelf.id"
                    :value="shelf.id"
                  >
                    {{ shelf.name }}
                  </option>
                </select>
                <button
                  @click="addToShelf"
                  :disabled="!selectedShelfId || isAddingToShelf"
                  class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            <!-- Notes -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Personal Notes</h3>
              <textarea
                v-model="notes"
                placeholder="Add your thoughts, memories, or listening notes..."
                rows="6"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              ></textarea>
              <div class="flex items-center justify-between mt-3">
                <span v-if="saveMessage" class="text-sm text-green-600">{{ saveMessage }}</span>
                <button
                  @click="saveNotes"
                  :disabled="isSavingNotes"
                  class="ml-auto px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium"
                >
                  {{ isSavingNotes ? 'Saving...' : 'Save Notes' }}
                </button>
              </div>
            </div>

            <!-- Discogs Link -->
            <div v-if="record.release.discogsId" class="mt-6 pt-6 border-t border-gray-200">
              <a
                :href="`https://www.discogs.com/release/${record.release.discogsId}`"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-purple-600 hover:text-purple-700 flex items-center"
              >
                View on Discogs
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
