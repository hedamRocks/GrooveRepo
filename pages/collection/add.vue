<script setup lang="ts">
/**
 * Manual add via Discogs search
 */

const router = useRouter()
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const isAdding = ref(false)
const addingId = ref<number | null>(null)

// Track expanded results to show versions
const expandedResults = ref<Set<number>>(new Set())
const versionsCache = ref<Map<number, any>>(new Map())
const loadingVersions = ref<Set<number>>(new Set())

let searchTimeout: NodeJS.Timeout | null = null

// Debounced search
watch(searchQuery, (newValue) => {
  if (searchTimeout) clearTimeout(searchTimeout)

  if (!newValue.trim()) {
    searchResults.value = []
    expandedResults.value.clear()
    versionsCache.value.clear()
    return
  }

  searchTimeout = setTimeout(async () => {
    await searchDiscogs()
  }, 500)
})

async function searchDiscogs() {
  if (!searchQuery.value.trim()) return

  isSearching.value = true
  try {
    const params = new URLSearchParams({ q: searchQuery.value })
    const response = await $fetch(`/api/discogs/search?${params}`)
    searchResults.value = response.results || []
  } catch (error) {
    console.error('Search failed:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

async function toggleVersions(result: any) {
  const masterId = result.master_id

  if (!masterId) {
    // No master release, just add this single version
    await addRecord(result.id)
    return
  }

  if (expandedResults.value.has(masterId)) {
    expandedResults.value.delete(masterId)
    return
  }

  // Expand and load versions if not cached
  expandedResults.value.add(masterId)

  if (!versionsCache.value.has(masterId)) {
    loadingVersions.value.add(masterId)
    try {
      const params = new URLSearchParams({ masterId: masterId.toString() })
      const response = await $fetch(`/api/discogs/master-versions?${params}`)
      versionsCache.value.set(masterId, response.versions || [])
    } catch (error) {
      console.error('Failed to load versions:', error)
      expandedResults.value.delete(masterId)
    } finally {
      loadingVersions.value.delete(masterId)
    }
  }
}

function getVersions(masterId: number) {
  return versionsCache.value.get(masterId) || []
}

function isExpanded(result: any) {
  return result.master_id && expandedResults.value.has(result.master_id)
}

function isLoadingVersions(result: any) {
  return result.master_id && loadingVersions.value.has(result.master_id)
}

async function addRecord(discogsId: number) {
  isAdding.value = true
  addingId.value = discogsId

  try {
    const response = await $fetch('/api/records/create', {
      method: 'POST',
      body: { discogsId }
    })

    // Redirect to the newly added record
    router.push(`/collection/${response.record.id}`)
  } catch (error: any) {
    alert(error.data?.message || 'Failed to add record')
    isAdding.value = false
    addingId.value = null
  }
}

function formatVersionDetails(version: any): string {
  const parts = []
  if (version.format) parts.push(version.format)
  if (version.country) parts.push(version.country)
  if (version.label) parts.push(version.label)
  if (version.catno) parts.push(version.catno)
  return parts.join(' · ')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="router.back()"
          class="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to collection
        </button>

        <h1 class="text-3xl font-bold text-gray-900 mb-2">Add a Record</h1>
        <p class="text-gray-600">Search Discogs to add a record to your collection</p>
      </div>

      <!-- Search Box -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search for artist, album, or label..."
            class="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <svg
            class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isSearching" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Searching Discogs...</p>
      </div>

      <!-- Search Results -->
      <div v-else-if="searchResults.length > 0" class="space-y-4">
        <div
          v-for="result in searchResults"
          :key="result.id"
          class="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden"
        >
          <!-- Main Result -->
          <div class="p-4 flex gap-4">
            <!-- Cover -->
            <div class="w-24 h-24 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden">
              <img
                v-if="result.cover_image || result.thumb"
                :src="result.thumb || result.cover_image"
                :alt="result.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
                <svg class="w-12 h-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
              </div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 truncate">{{ result.title }}</h3>
              <p class="text-sm text-gray-600 truncate">{{ result.year || 'Year unknown' }}</p>
              <p v-if="result.label?.length" class="text-sm text-gray-500 truncate">
                {{ result.label.join(', ') }}
              </p>
              <p v-if="result.genre?.length" class="text-xs text-gray-400 mt-1">
                {{ result.genre.join(', ') }}
              </p>
              <p v-if="result.format?.length" class="text-xs text-purple-600 mt-1 font-medium">
                {{ result.format.join(', ') }}
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col gap-2 items-end justify-center">
              <!-- Show Versions Button (if master exists) -->
              <button
                v-if="result.master_id"
                @click="toggleVersions(result)"
                class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium flex items-center gap-1"
              >
                <svg
                  class="w-4 h-4 transition-transform"
                  :class="{ 'rotate-180': isExpanded(result) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
                {{ isExpanded(result) ? 'Hide' : 'Show' }} Versions
              </button>

              <!-- Add Button -->
              <button
                @click="addRecord(result.id)"
                :disabled="isAdding && addingId === result.id"
                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {{ isAdding && addingId === result.id ? 'Adding...' : result.master_id ? 'Add This Version' : 'Add' }}
              </button>
            </div>
          </div>

          <!-- Versions List (Expandable) -->
          <div v-if="isExpanded(result)" class="border-t border-gray-200 bg-gray-50">
            <!-- Loading State -->
            <div v-if="isLoadingVersions(result)" class="p-4 text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p class="text-sm text-gray-600">Loading versions...</p>
            </div>

            <!-- Versions List -->
            <div v-else class="divide-y divide-gray-200">
              <div
                v-for="version in getVersions(result.master_id)"
                :key="version.id"
                class="p-3 hover:bg-gray-100 transition flex items-center justify-between gap-4"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ version.title }}</p>
                  <p class="text-xs text-gray-600">{{ formatVersionDetails(version) }}</p>
                </div>
                <button
                  @click="addRecord(version.id)"
                  :disabled="isAdding && addingId === version.id"
                  class="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex-shrink-0"
                >
                  {{ isAdding && addingId === version.id ? 'Adding...' : 'Add' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="searchQuery && !isSearching" class="text-center py-12">
        <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
        <p class="text-gray-600">Try a different search term</p>
      </div>

      <!-- Initial State -->
      <div v-else class="text-center py-12">
        <div class="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Search Discogs</h3>
        <p class="text-gray-600">Enter an artist, album, or label to get started</p>
      </div>
    </div>
  </div>
</template>
