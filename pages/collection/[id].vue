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
            <div v-if="record.release.discogsData?.tracklist?.length" class="mb-8 pb-8 border-b border-gray-200">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Tracklist</h3>
              <div class="space-y-2">
                <div
                  v-for="(track, index) in record.release.discogsData.tracklist"
                  :key="index"
                  class="flex gap-3 text-sm"
                >
                  <span class="text-gray-500 font-mono w-8 flex-shrink-0">{{ track.position || (index + 1) }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-gray-900 truncate">{{ track.title }}</p>
                    <p v-if="track.duration" class="text-xs text-gray-500">{{ track.duration }}</p>
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
