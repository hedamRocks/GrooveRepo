<script setup lang="ts">
import { navigateTo } from 'nuxt/app'

/**
 * Collection grid - visual browsing with search
 */

const search = ref('')
const searchDebounced = ref('')
const isLoading = ref(true)
const records = ref<any[]>([])
const totalRecords = ref(0)
const isSyncing = ref(false)

let debounceTimeout: NodeJS.Timeout | null = null

// Debounce search input
watch(search, (newValue) => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    searchDebounced.value = newValue
  }, 300)
})

// Fetch records when search changes
watch(searchDebounced, async () => {
  await fetchRecords()
}, { immediate: true })

async function fetchRecords() {
  isLoading.value = true
  try {
    const params = new URLSearchParams()
    if (searchDebounced.value) {
      params.append('search', searchDebounced.value)
    }
    params.append('limit', '100')

    const response = await $fetch(`/api/records?${params}`)
    records.value = response.records
    totalRecords.value = response.pagination.total
  } catch (error) {
    console.error('Failed to fetch records:', error)
  } finally {
    isLoading.value = false
  }
}

// Clear search
function clearSearch() {
  search.value = ''
}

// Sync with Discogs
async function syncDiscogs() {
  navigateTo('/onboarding/import-progress')
}

// Refresh metadata for all records
const isRefreshing = ref(false)
async function refreshMetadata() {
  if (!confirm('This will fetch full details for all records from Discogs. This may take several minutes. Continue?')) {
    return
  }

  isRefreshing.value = true
  try {
    const response = await $fetch('/api/import/refresh-all-metadata', {
      method: 'POST'
    })
    alert(`Metadata refreshed! Updated: ${response.updated}, Failed: ${response.failed}`)
    await fetchRecords() // Reload records
  } catch (error) {
    alert('Failed to refresh metadata')
  } finally {
    isRefreshing.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 py-6">
        <div class="flex items-start justify-between mb-6">
          <div>
            <h1 class="text-4xl font-light text-gray-900 tracking-tight">Collection</h1>
            <p class="text-gray-500 mt-2 font-light">{{ totalRecords }} records</p>
          </div>
          <div class="flex gap-2">
            <button
              @click="syncDiscogs"
              :disabled="isSyncing"
              class="border border-gray-200 text-gray-700 px-5 py-2.5 hover:border-gray-400 transition font-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSyncing ? 'Syncing...' : 'Sync Discogs' }}
            </button>
            <button
              @click="refreshMetadata"
              :disabled="isRefreshing"
              class="border border-gray-200 text-gray-700 px-5 py-2.5 hover:border-gray-400 transition font-light disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fetch full details (tracklist, community data) for all records"
            >
              {{ isRefreshing ? 'Refreshing...' : 'Refresh Metadata' }}
            </button>
            <NuxtLink
              to="/collection/add"
              class="bg-black text-white px-5 py-2.5 hover:bg-gray-800 transition font-light border border-black"
            >
              Add Record
            </NuxtLink>
            <NuxtLink
              to="/shelves"
              class="border border-gray-200 text-gray-700 px-5 py-2.5 hover:border-gray-400 transition font-light"
            >
              Shelves
            </NuxtLink>
            <NuxtLink
              to="/stats"
              class="border border-gray-200 text-gray-700 px-5 py-2.5 hover:border-gray-400 transition font-light"
            >
              Stats
            </NuxtLink>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="relative">
          <input
            v-model="search"
            type="text"
            placeholder="Search by artist, title, or label..."
            class="w-full px-4 py-3.5 pl-11 pr-11 border border-gray-200 focus:border-gray-400 outline-none transition font-light"
          />
          <svg
            class="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            stroke-width="1.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <button
            v-if="search"
            @click="clearSearch"
            class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Collection Grid -->
    <main class="max-w-7xl mx-auto px-6 lg:px-8 py-10">
      <!-- Loading State -->
      <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <div
          v-for="i in 12"
          :key="i"
          class="aspect-square bg-gray-100 animate-pulse"
        ></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="records.length === 0" class="text-center py-20">
        <h3 class="text-2xl font-light text-gray-900 mb-2 tracking-tight">
          {{ search ? 'No records found' : 'No records yet' }}
        </h3>
        <p class="text-gray-500 mb-8 font-light">
          {{ search ? 'Try a different search term' : 'Start building your collection' }}
        </p>
        <NuxtLink
          v-if="!search"
          to="/collection/add"
          class="inline-block bg-black text-white px-6 py-3 hover:bg-gray-800 transition font-light border border-black"
        >
          Add your first record
        </NuxtLink>
      </div>

      <!-- Records Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <NuxtLink
          v-for="record in records"
          :key="record.id"
          :to="`/collection/${record.id}`"
          class="group"
        >
          <div class="aspect-square bg-gray-100 overflow-hidden border border-gray-200 hover:border-gray-400 transition">
            <img
              v-if="record.release.coverUrl || record.release.thumbUrl"
              :src="record.release.coverUrl || record.release.thumbUrl"
              :alt="record.release.title"
              class="w-full h-full object-cover group-hover:opacity-90 transition"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gray-50">
              <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
              </svg>
            </div>
          </div>
          <div class="mt-2 space-y-0.5">
            <p class="text-xs font-light text-gray-900 truncate">{{ record.release.artist || 'Unknown Artist' }}</p>
            <p class="text-xs text-gray-500 truncate font-light">{{ record.release.title }}</p>
          </div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>
