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

// Track analysis (shared composable handles polling + progress + cleanup)
const analyzingTrackId = ref<string | null>(null)
const {
  isAnalyzing: isAnalyzingTracks,
  total: analysisTotal,
  processed: analysisProcessed,
  failed: analysisFailed,
  progress: analysisProgress,
  error: analysisError,
  start: startAnalysis,
} = useTrackAnalysis(async () => {
  await fetchRecord()
  analyzingTrackId.value = null
})

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
  await startAnalysis({ trackIds: record.value.tracks.map((t: any) => t.id) })
}

async function analyzeSingleTrack(trackId: string) {
  // Explicit per-track (re-)analysis — force, so a track that already has a
  // BPM still gets re-run.
  analyzingTrackId.value = trackId
  await startAnalysis({ trackIds: [trackId], force: true })
}

onMounted(() => {
  fetchRecord()
  fetchShelves()
})
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
    <!-- Loading State -->
    <div v-if="isLoadingRecord" class="flex items-center justify-center min-h-[70vh]">
      <div class="text-center">
        <div class="w-14 h-14 mx-auto relative mb-5">
          <div class="absolute inset-0 rounded-full border-2 border-white/10"></div>
          <div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style="border-top-color: var(--accent);"></div>
        </div>
        <p class="font-mono text-sm" style="color: var(--text-secondary);">Loading record…</p>
      </div>
    </div>

    <!-- Record Detail -->
    <div v-else-if="record" class="py-8 fade-in">
      <!-- Back Button -->
      <button @click="router.back()" class="btn-ghost mb-6 -ml-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
        </svg>
        Back to collection
      </button>

      <div class="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 lg:gap-10">
        <!-- Cover Art -->
        <div class="lg:sticky lg:top-24 self-start">
          <div class="aspect-square rounded-2xl overflow-hidden relative group" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle);">
            <img
              v-if="record.release.coverUrl"
              :src="record.release.coverUrl"
              :alt="record.release.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-28 h-28" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
              </svg>
            </div>
          </div>

          <!-- Community + Discogs link under cover -->
          <div class="flex items-center gap-3 mt-4">
            <div v-if="record.release.communityHave" class="surface-2 px-3 py-2 flex-1">
              <p class="text-[10px] uppercase tracking-wider" style="color: var(--text-tertiary);">Have</p>
              <p class="font-semibold font-mono text-sm" style="color: var(--text-primary);">{{ record.release.communityHave.toLocaleString() }}</p>
            </div>
            <div v-if="record.release.communityWant" class="surface-2 px-3 py-2 flex-1">
              <p class="text-[10px] uppercase tracking-wider" style="color: var(--text-tertiary);">Want</p>
              <p class="font-semibold font-mono text-sm" style="color: var(--text-primary);">{{ record.release.communityWant.toLocaleString() }}</p>
            </div>
          </div>
          <a
            v-if="record.release.discogsId"
            :href="`https://www.discogs.com/release/${record.release.discogsId}`"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-secondary w-full mt-3 text-sm"
          >
            View on Discogs
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </a>
        </div>

        <!-- Metadata & Notes -->
        <div class="min-w-0">
          <!-- Title & Artist -->
          <div class="mb-8 slide-up">
            <p class="eyebrow mb-3">Record details</p>
            <h1 class="display text-3xl lg:text-5xl mb-3">
              {{ record.release.title }}
            </h1>
            <p class="text-lg lg:text-xl" style="color: var(--text-secondary);">
              {{ record.release.artist || 'Unknown Artist' }}
            </p>
          </div>

          <!-- Metadata Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 mb-8 pb-8" style="border-bottom: 1px solid var(--border-subtle);">
            <div v-if="record.release.label">
              <p class="text-[10px] font-mono uppercase tracking-wider mb-1" style="color: var(--text-tertiary);">Label</p>
              <p class="font-medium text-sm" style="color: var(--text-primary);">{{ record.release.label }}</p>
            </div>
            <div v-if="record.release.catNo">
              <p class="text-[10px] font-mono uppercase tracking-wider mb-1" style="color: var(--text-tertiary);">Catalog #</p>
              <p class="font-medium text-sm" style="color: var(--text-primary);">{{ record.release.catNo }}</p>
            </div>
            <div v-if="record.release.year">
              <p class="text-[10px] font-mono uppercase tracking-wider mb-1" style="color: var(--text-tertiary);">Year</p>
              <p class="font-medium text-sm" style="color: var(--text-primary);">{{ record.release.year }}</p>
            </div>
            <div v-if="record.release.country">
              <p class="text-[10px] font-mono uppercase tracking-wider mb-1" style="color: var(--text-tertiary);">Country</p>
              <p class="font-medium text-sm" style="color: var(--text-primary);">{{ record.release.country }}</p>
            </div>
            <div v-if="record.release.formats?.length">
              <p class="text-[10px] font-mono uppercase tracking-wider mb-1" style="color: var(--text-tertiary);">Format</p>
              <p class="font-medium text-sm" style="color: var(--text-primary);">{{ record.release.formats.join(', ') }}</p>
            </div>
            <div v-if="record.release.genres?.length">
              <p class="text-[10px] font-mono uppercase tracking-wider mb-1" style="color: var(--text-tertiary);">Genres</p>
              <p class="font-medium text-sm" style="color: var(--text-primary);">{{ record.release.genres.join(', ') }}</p>
            </div>
            <div v-if="record.release.styles?.length" class="col-span-2 sm:col-span-3">
              <p class="text-[10px] font-mono uppercase tracking-wider mb-2" style="color: var(--text-tertiary);">Styles</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="style in record.release.styles" :key="style" class="chip">{{ style }}</span>
              </div>
            </div>
          </div>

          <!-- Condition Tracking -->
          <div class="mb-8 pb-8" style="border-bottom: 1px solid var(--border-subtle);">
            <p class="eyebrow mb-4">Condition</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm mb-2" style="color: var(--text-secondary);">Media</label>
                <select v-model="mediaCondition" class="input w-full px-3 py-2.5 text-sm">
                  <option value="">Not graded</option>
                  <option v-for="option in conditionOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm mb-2" style="color: var(--text-secondary);">Sleeve</label>
                <select v-model="sleeveCondition" class="input w-full px-3 py-2.5 text-sm">
                  <option value="">Not graded</option>
                  <option v-for="option in conditionOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Tracklist -->
          <div v-if="record.tracks?.length" class="mb-8 pb-8" style="border-bottom: 1px solid var(--border-subtle);">
            <div class="flex items-center justify-between mb-4">
              <p class="eyebrow">Tracklist</p>
              <button
                @click="analyzeAllTracks"
                :disabled="isAnalyzingTracks"
                class="text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                style="color: var(--accent);"
              >
                {{ isAnalyzingTracks ? 'Analyzing…' : 'Analyze all tracks' }}
              </button>
            </div>

            <!-- Analysis progress -->
            <div v-if="isAnalyzingTracks" class="mb-4 surface-2 px-3 py-2.5">
              <div class="flex items-center justify-between text-[11px] font-mono mb-1.5" style="color: var(--text-secondary);">
                <span>{{ analysisProcessed }} / {{ analysisTotal || '…' }} tracks<span v-if="analysisFailed"> · {{ analysisFailed }} failed</span></span>
                <span class="font-semibold" style="color: var(--accent);">{{ analysisProgress }}%</span>
              </div>
              <div class="w-full h-1.5 rounded-full overflow-hidden" style="background: var(--bg-secondary);">
                <div class="h-full rounded-full transition-all duration-500" style="background: var(--accent);" :style="{ width: `${analysisProgress}%` }"></div>
              </div>
            </div>
            <p v-if="analysisError" class="mb-4 text-xs" style="color: #ff6b6b;">{{ analysisError }}</p>

            <div class="surface divide-y" style="--tw-divide-opacity: 1;">
              <div
                v-for="track in record.tracks"
                :key="track.id"
                class="flex items-center gap-3 px-4 py-2.5 transition-colors group hover:bg-white/[0.03]"
                style="border-top: 1px solid var(--border-subtle);"
              >
                <span class="font-mono text-xs w-8 flex-shrink-0 font-semibold" style="color: var(--text-tertiary);">
                  {{ track.position }}
                </span>

                <div class="flex-1 min-w-0">
                  <p class="text-sm truncate font-medium" style="color: var(--text-primary);">{{ track.title }}</p>
                  <p v-if="track.duration" class="text-xs font-mono" style="color: var(--text-tertiary);">{{ track.duration }}</p>
                </div>

                <!-- DJ Metadata -->
                <div class="flex items-center gap-1.5">
                  <div v-if="track.bpm" class="inline-flex items-center gap-1">
                    <div v-if="editingTrackId === track.id" class="flex items-center gap-1">
                      <input
                        v-model.number="editingBpm"
                        type="number"
                        min="20"
                        max="300"
                        class="input w-16 px-2 py-1 text-xs font-mono"
                        @keyup.enter="saveTrackBpm(track.id)"
                        @keyup.esc="cancelEditBpm"
                      />
                      <button @click="saveTrackBpm(track.id)" class="px-2 py-1 text-xs rounded-md text-white" style="background: var(--accent);">✓</button>
                      <button @click="cancelEditBpm" class="px-2 py-1 text-xs rounded-md surface-2" style="color: var(--text-secondary);">✕</button>
                    </div>
                    <span
                      v-else
                      @click="startEditBpm(track)"
                      class="chip font-mono cursor-pointer hover:border-[var(--accent)] !text-[11px]"
                      title="Click to edit BPM"
                    >
                      {{ track.bpm }} BPM
                    </span>
                  </div>
                  <span v-if="track.key" class="chip font-mono !text-[11px]">{{ track.key }}</span>
                  <span v-if="track.energy" class="chip font-mono !text-[11px]">E{{ track.energy }}</span>
                  <button
                    v-if="!track.bpm"
                    @click="analyzeSingleTrack(track.id)"
                    :disabled="analyzingTrackId === track.id"
                    class="opacity-0 group-hover:opacity-100 text-xs font-medium transition-opacity disabled:opacity-50"
                    style="color: var(--accent);"
                  >
                    {{ analyzingTrackId === track.id ? 'Analyzing…' : 'Analyze' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Shelves -->
          <div class="mb-8 pb-8" style="border-bottom: 1px solid var(--border-subtle);">
            <p class="eyebrow mb-4">On shelves</p>
            <div v-if="record.shelfPlacements.length > 0" class="flex flex-wrap gap-2 mb-3">
              <div
                v-for="placement in record.shelfPlacements"
                :key="placement.id"
                class="inline-flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-full text-sm font-medium"
                style="border: 1px solid var(--border-subtle); background: var(--bg-tertiary);"
              >
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: placement.shelf.color || '#ff4d3d' }"></span>
                <span style="color: var(--text-primary);">{{ placement.shelf.name }}</span>
                <button @click="removeFromShelf(placement.shelf.id)" class="hover:opacity-70" style="color: var(--text-tertiary);">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Add to Shelf -->
            <div class="flex gap-2">
              <select v-model="selectedShelfId" class="input flex-1 px-3 py-2.5 text-sm">
                <option value="">Add to shelf…</option>
                <option v-for="shelf in shelves" :key="shelf.id" :value="shelf.id">{{ shelf.name }}</option>
              </select>
              <button
                @click="addToShelf"
                :disabled="!selectedShelfId || isAddingToShelf"
                class="btn-primary !py-2.5 !px-5 text-sm"
              >
                Add
              </button>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <p class="eyebrow mb-4">Personal notes</p>
            <textarea
              v-model="notes"
              placeholder="Add your thoughts, memories, or listening notes…"
              rows="5"
              class="input w-full px-4 py-3 resize-none text-sm"
            ></textarea>
            <div class="flex items-center justify-between mt-3">
              <span v-if="saveMessage" class="text-sm" :style="{ color: saveMessage.includes('Failed') ? '#ff6b6b' : 'var(--accent)' }">{{ saveMessage }}</span>
              <button
                @click="saveNotes"
                :disabled="isSavingNotes"
                class="btn-primary ml-auto !py-2.5 !px-6 text-sm"
              >
                {{ isSavingNotes ? 'Saving…' : 'Save notes' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
