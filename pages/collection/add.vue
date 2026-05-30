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
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="mb-8">
      <button
        @click="router.back()"
        class="btn-ghost mb-5 -ml-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
        </svg>
        Back to collection
      </button>

      <p class="eyebrow mb-2">Add to collection</p>
      <h1 class="display text-4xl mb-2">Search Discogs</h1>
      <p style="color: var(--text-secondary);">Find an artist, album, or label and add the exact pressing you own.</p>
    </div>

    <!-- Search Box -->
    <div class="relative">
      <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search for artist, album, or label…"
        class="input w-full pl-12 pr-4 py-3.5 text-base"
      />
    </div>

    <!-- Loading -->
    <div v-if="isSearching" class="text-center py-16">
      <div class="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4" style="border-color: var(--accent); border-top-color: transparent;"></div>
      <p style="color: var(--text-secondary);">Searching Discogs…</p>
    </div>

    <!-- Search Results -->
    <div v-else-if="searchResults.length > 0" class="space-y-3 mt-6">
      <div
        v-for="result in searchResults"
        :key="result.id"
        class="surface overflow-hidden glass-hover"
      >
        <!-- Main Result -->
        <div class="p-4 flex gap-4">
          <!-- Cover -->
          <div class="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden" style="background: var(--bg-tertiary);">
            <img
              v-if="result.cover_image || result.thumb"
              :src="result.thumb || result.cover_image"
              :alt="result.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-10 h-10" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
              </svg>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold truncate" style="color: var(--text-primary);">{{ result.title }}</h3>
            <p class="text-sm truncate mt-0.5" style="color: var(--text-secondary);">{{ result.year || 'Year unknown' }}</p>
            <p v-if="result.label?.length" class="text-sm truncate mt-0.5" style="color: var(--text-tertiary);">
              {{ result.label.join(', ') }}
            </p>
            <div v-if="result.format?.length" class="flex flex-wrap gap-1.5 mt-2">
              <span v-for="f in result.format.slice(0, 3)" :key="f" class="chip !py-0.5 !px-2 !text-[11px]">{{ f }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col gap-2 items-end justify-center shrink-0">
            <!-- Show Versions Button (if master exists) -->
            <button
              v-if="result.master_id"
              @click="toggleVersions(result)"
              class="btn-ghost text-sm"
            >
              <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': isExpanded(result) }" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
              </svg>
              {{ isExpanded(result) ? 'Hide' : 'Versions' }}
            </button>

            <!-- Add Button -->
            <button
              @click="addRecord(result.id)"
              :disabled="isAdding && addingId === result.id"
              class="btn-primary !py-2 !px-4 text-sm"
            >
              {{ isAdding && addingId === result.id ? 'Adding…' : result.master_id ? 'Add version' : 'Add' }}
            </button>
          </div>
        </div>

        <!-- Versions List (Expandable) -->
        <div v-if="isExpanded(result)" style="border-top: 1px solid var(--border-subtle); background: var(--bg-primary);">
          <!-- Loading State -->
          <div v-if="isLoadingVersions(result)" class="p-4 text-center">
            <div class="w-7 h-7 border-2 rounded-full animate-spin mx-auto mb-2" style="border-color: var(--accent); border-top-color: transparent;"></div>
            <p class="text-sm" style="color: var(--text-secondary);">Loading versions…</p>
          </div>

          <!-- Versions List -->
          <div v-else>
            <div
              v-for="version in getVersions(result.master_id)"
              :key="version.id"
              class="p-3 px-4 flex items-center justify-between gap-4 transition-colors hover:bg-white/[0.03]"
              style="border-top: 1px solid var(--border-subtle);"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate" style="color: var(--text-primary);">{{ version.title }}</p>
                <p class="text-xs mt-0.5" style="color: var(--text-tertiary);">{{ formatVersionDetails(version) }}</p>
              </div>
              <button
                @click="addRecord(version.id)"
                :disabled="isAdding && addingId === version.id"
                class="btn-secondary !py-1.5 !px-3.5 text-sm flex-shrink-0"
              >
                {{ isAdding && addingId === version.id ? 'Adding…' : 'Add' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="searchQuery && !isSearching" class="text-center py-16">
      <div class="w-20 h-20 surface rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-9 h-9" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <h3 class="display text-xl mb-2">No results found</h3>
      <p style="color: var(--text-secondary);">Try a different search term.</p>
    </div>

    <!-- Initial State -->
    <div v-else class="text-center py-16">
      <div class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style="background: var(--accent-soft); border: 1px solid var(--border-subtle);">
        <svg class="w-9 h-9" style="color: var(--accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <h3 class="display text-xl mb-2">Start typing to search</h3>
      <p style="color: var(--text-secondary);">Enter an artist, album, or label to get started.</p>
    </div>
  </div>
</template>
