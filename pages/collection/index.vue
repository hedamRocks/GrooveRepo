<script setup lang="ts">
import { navigateTo } from 'nuxt/app'

/**
 * Collection grid - visual browsing with search
 */

const search = ref('')
const searchDebounced = ref('')
const isLoading = ref(true)
const isLoadingMore = ref(false)
const hasError = ref(false)
const records = ref<any[]>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const hasMore = ref(true)
const isSyncing = ref(false)

// Filter state
const showFilters = ref(false)
const filters = ref({
  genres: [] as string[],
  styles: [] as string[],
  yearRange: { min: null as number | null, max: null as number | null },
  countries: [] as string[],
  labels: [] as string[]
})

// Filter options (will be populated from API or computed from records)
const filterOptions = ref({
  genres: [] as string[],
  styles: [] as string[],
  countries: [] as string[],
  labels: [] as string[],
  years: { min: 1950, max: new Date().getFullYear() }
})

const activeFiltersCount = computed(() => {
  return filters.value.genres.length +
         filters.value.styles.length +
         filters.value.countries.length +
         filters.value.labels.length +
         (filters.value.yearRange.min !== null || filters.value.yearRange.max !== null ? 1 : 0)
})

let debounceTimeout: NodeJS.Timeout | null = null

// Debounce search input
watch(search, (newValue) => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    searchDebounced.value = newValue
  }, 300)
})

// Refetch when search or filters change (user-driven, client-only).
// The initial load happens in onMounted — not `immediate` — so we don't fire a
// pointless cookie-less request during SSR (whose result isn't rendered anyway).
watch([searchDebounced, filters], async () => {
  currentPage.value = 1
  records.value = []
  await fetchRecords(true)
}, { deep: true })

async function fetchRecords(reset = false) {
  if (reset) {
    isLoading.value = true
    hasError.value = false
    currentPage.value = 1
    records.value = []
  } else {
    isLoadingMore.value = true
  }

  try {
    const params = new URLSearchParams()
    if (searchDebounced.value) {
      params.append('search', searchDebounced.value)
    }

    // Add filter parameters
    if (filters.value.genres.length > 0) {
      params.append('genres', filters.value.genres.join(','))
    }
    if (filters.value.styles.length > 0) {
      params.append('styles', filters.value.styles.join(','))
    }
    if (filters.value.countries.length > 0) {
      params.append('countries', filters.value.countries.join(','))
    }
    if (filters.value.labels.length > 0) {
      params.append('labels', filters.value.labels.join(','))
    }
    if (filters.value.yearRange.min !== null) {
      params.append('yearMin', filters.value.yearRange.min.toString())
    }
    if (filters.value.yearRange.max !== null) {
      params.append('yearMax', filters.value.yearRange.max.toString())
    }

    params.append('page', currentPage.value.toString())
    params.append('limit', '100')

    const response = await $fetch(`/api/records?${params}`)

    if (reset) {
      records.value = response.records
    } else {
      records.value = [...records.value, ...response.records]
    }

    totalRecords.value = response.pagination.total
    hasMore.value = currentPage.value < response.pagination.totalPages
  } catch (error) {
    console.error('Failed to fetch records:', error)
    if (reset) hasError.value = true
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// Infinite scroll
function handleScroll() {
  if (isLoadingMore.value || !hasMore.value) return

  const scrollPosition = window.innerHeight + window.scrollY
  const pageHeight = document.documentElement.scrollHeight

  // Load more when within 500px of bottom
  if (scrollPosition >= pageHeight - 500) {
    loadMore()
  }
}

async function loadMore() {
  if (!hasMore.value || isLoadingMore.value) return

  currentPage.value++
  await fetchRecords(false)
}

// Setup scroll listener + initial client-side load
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  fetchRecords(true)
  loadFilterOptions()
  loadBackfillStatus()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Load the full set of filter facets across the WHOLE collection (server-side),
// not just the records currently loaded into the grid.
async function loadFilterOptions() {
  try {
    filterOptions.value = await $fetch('/api/records/filter-options')
  } catch (error) {
    console.error('Failed to load filter options:', error)
  }
}

// ---- Tracklist backfill (shared state via composable) ----
const {
  missing: backfillMissing,
  job: backfillJob,
  running: backfillRunning,
  total: backfillTotal,
  done: backfillDone,
  percent: backfillPercent,
  starting: backfillStarting,
  loadStatus: loadBackfillStatus,
  start: startBackfill,
} = useTracklistBackfill()

// When a running backfill finishes, the tracks now exist — refresh grid + facets.
watch(backfillRunning, (now, was) => {
  if (was && !now) {
    fetchRecords(true)
    loadFilterOptions()
  }
})

// Clear search
function clearSearch() {
  search.value = ''
}
// Filter functions
function toggleFilter(type: 'genres' | 'styles' | 'countries' | 'labels', value: string) {
  const filterArray = filters.value[type] as string[]
  const index = filterArray.indexOf(value)
  if (index > -1) {
    filterArray.splice(index, 1)
  } else {
    filterArray.push(value)
  }
}

function clearFilters() {
  filters.value = {
    genres: [],
    styles: [],
    yearRange: { min: null, max: null },
    countries: [],
    labels: []
  }
}

function clearFilter(type: 'genres' | 'styles' | 'countries' | 'labels' | 'yearRange') {
  if (type === 'yearRange') {
    filters.value.yearRange = { min: null, max: null }
  } else {
    filters.value[type] = []
  }
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

// DJ Metadata Analysis
const isAnalyzing = ref(false)
const analysisJobId = ref<string | null>(null)
const analysisProgress = ref(0)
const analysisStatus = ref<string | null>(null)
let analysisInterval: NodeJS.Timeout | null = null
let analysisFailures = 0

async function analyzeDJMetadata() {
  if (!confirm('This will analyze all your records to extract BPM, key, and energy data from YouTube. This will take several hours for large collections. Continue?')) {
    return
  }

  isAnalyzing.value = true
  try {
    const response = await $fetch<{
      jobId: string
      status: string
      totalTracks: number
      message: string
    }>('/api/analysis/start', {
      method: 'POST',
      body: { analyzeAll: true }
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
        await fetchRecords() // Reload records
        analysisJobId.value = null
      } else if (status.status === 'failed') {
        stopAnalysisPolling()
        isAnalyzing.value = false
        analysisJobId.value = null
      }
    } catch (error) {
      // Stop after repeated failures so we don't poll a dead/expired job forever
      if (++analysisFailures >= 3) {
        stopAnalysisPolling()
        isAnalyzing.value = false
      }
    }
  }, 3000) // Poll every 3 seconds
}

onUnmounted(stopAnalysisPolling)
</script>

<template>
  <div class="max-w-8xl mx-auto px-4 sm:px-6 pb-24">
    <!-- Toolbar -->
    <div class="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mb-2 backdrop-blur-xl" style="background: rgba(11,11,12,0.7);">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="flex items-center gap-3 shrink-0">
          <h1 class="display text-2xl sm:text-3xl">Collection</h1>
          <span class="chip font-mono text-xs">{{ totalRecords }} records</span>
        </div>

        <!-- Search -->
        <div class="relative flex-1 sm:max-w-md sm:ml-auto">
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Search artist, title, label…"
            class="input w-full pl-11 pr-10 py-2.5 text-sm"
          />
          <button
            v-if="search"
            @click="clearSearch"
            class="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style="color: var(--text-tertiary);"
            aria-label="Clear search"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Sync button -->
        <button
          @click="syncDiscogs"
          class="btn-secondary !py-2.5 !px-4 text-sm shrink-0"
          title="Re-sync with Discogs (fetches full tracklists)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992V4.356M3.985 14.652H-.007v4.992M4.94 9.348a8 8 0 0114.06-2.66l2.018 1.66M19.06 14.652a8 8 0 01-14.06 2.66L2.982 15.652"></path>
          </svg>
          <span class="hidden sm:inline">Sync</span>
        </button>

        <!-- Filter button -->
        <button
          @click="showFilters = true"
          class="btn-secondary !py-2.5 !px-4 text-sm relative shrink-0"
          :class="{ '!border-[var(--accent)] text-white': activeFiltersCount > 0 }"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"></path>
          </svg>
          Filters
          <span v-if="activeFiltersCount > 0" class="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold rounded-full" style="background: var(--accent); color: #fff;">{{ activeFiltersCount }}</span>
        </button>
      </div>
    </div>

    <!-- Tracklist backfill banner -->
    <div v-if="backfillRunning || backfillMissing > 0" class="surface px-4 py-3 mb-4 flex items-center gap-4">
      <span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background: var(--accent-soft);">
        <svg class="w-4.5 h-4.5" style="color: var(--accent); width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
        </svg>
      </span>
      <div class="flex-1 min-w-0">
        <template v-if="backfillRunning">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-medium" style="color: var(--text-primary);">Fetching tracklists…</p>
            <p class="text-sm font-mono font-semibold" style="color: var(--accent);">{{ backfillPercent }}%</p>
          </div>
          <div class="w-full h-1.5 rounded-full mt-2 overflow-hidden" style="background: var(--bg-tertiary);">
            <div class="h-full rounded-full transition-all duration-500" style="background: var(--accent);" :style="{ width: `${backfillPercent}%` }"></div>
          </div>
          <p class="text-xs mt-1.5 font-mono" style="color: var(--text-secondary);">
            {{ backfillDone }} of {{ backfillTotal }} records<span v-if="backfillJob?.failedItems"> · {{ backfillJob.failedItems }} failed</span>
          </p>
        </template>
        <template v-else>
          <p class="text-sm font-medium" style="color: var(--text-primary);">{{ backfillMissing }} {{ backfillMissing === 1 ? 'record is' : 'records are' }} missing tracklists</p>
          <p class="text-xs mt-0.5" style="color: var(--text-secondary);">Fetch them to use these records in setlists. Runs in the background (~1s per record).</p>
        </template>
      </div>
      <button v-if="!backfillRunning" @click="startBackfill" :disabled="backfillStarting" class="btn-primary !py-2 !px-4 text-sm shrink-0">
        {{ backfillStarting ? 'Starting…' : 'Fetch tracklists' }}
      </button>
      <div v-else class="w-5 h-5 border-2 rounded-full animate-spin shrink-0" style="border-color: var(--accent); border-top-color: transparent;"></div>
    </div>

    <!-- Filter Slide-in Panel -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showFilters"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          @click="showFilters = false"
        >
          <Transition
            enter-active-class="transition-transform duration-300 ease-out"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition-transform duration-200 ease-in"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
          >
            <div
              v-if="showFilters"
              class="absolute right-0 top-0 h-full w-full sm:w-[26rem] filter-panel flex flex-col"
              style="background: var(--bg-secondary); border-left: 1px solid var(--border-subtle);"
              @click.stop
            >
              <!-- Filter Header -->
              <div class="flex items-center justify-between p-5" style="border-bottom: 1px solid var(--border-subtle);">
                <div>
                  <h2 class="display text-xl">Filters</h2>
                  <p class="text-xs" style="color: var(--text-secondary);">Refine your collection</p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    v-if="activeFiltersCount > 0"
                    @click="clearFilters"
                    class="btn-ghost text-xs"
                    style="color: var(--accent);"
                  >
                    Clear all
                  </button>
                  <button
                    @click="showFilters = false"
                    class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06]"
                    style="color: var(--text-secondary);"
                    aria-label="Close filters"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Filter Content -->
              <div class="p-5 overflow-y-auto flex-1">
                <!-- Active Filters -->
                <div v-if="activeFiltersCount > 0" class="mb-6">
                  <p class="eyebrow mb-3">Active</p>
                  <div class="flex flex-wrap gap-2">
                    <button v-for="genre in filters.genres" :key="`active-genre-${genre}`" @click="toggleFilter('genres', genre)" class="chip chip-active">
                      {{ genre }}
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <button v-for="style in filters.styles" :key="`active-style-${style}`" @click="toggleFilter('styles', style)" class="chip chip-active">
                      {{ style }}
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <button v-for="country in filters.countries" :key="`active-country-${country}`" @click="toggleFilter('countries', country)" class="chip chip-active">
                      {{ country }}
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <button v-for="label in filters.labels" :key="`active-label-${label}`" @click="toggleFilter('labels', label)" class="chip chip-active">
                      {{ label }}
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <button v-if="filters.yearRange.min !== null || filters.yearRange.max !== null" @click="clearFilter('yearRange')" class="chip chip-active">
                      {{ filters.yearRange.min || filterOptions.years.min }}–{{ filters.yearRange.max || filterOptions.years.max }}
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                </div>

                <!-- Year Range Filter -->
                <div v-if="filterOptions.years.min < filterOptions.years.max" class="mb-7">
                  <p class="eyebrow mb-3">Release year</p>
                  <div class="flex items-center gap-3">
                    <div class="flex-1">
                      <label class="text-xs" style="color: var(--text-secondary);">From</label>
                      <input v-model.number="filters.yearRange.min" type="number" :min="filterOptions.years.min" :max="filterOptions.years.max" class="input w-full mt-1 px-3 py-2 text-sm" :placeholder="filterOptions.years.min.toString()" />
                    </div>
                    <div class="flex-1">
                      <label class="text-xs" style="color: var(--text-secondary);">To</label>
                      <input v-model.number="filters.yearRange.max" type="number" :min="filterOptions.years.min" :max="filterOptions.years.max" class="input w-full mt-1 px-3 py-2 text-sm" :placeholder="filterOptions.years.max.toString()" />
                    </div>
                  </div>
                </div>

                <!-- Genres Filter -->
                <div v-if="filterOptions.genres.length > 0" class="mb-7">
                  <p class="eyebrow mb-3">Genres</p>
                  <div class="flex flex-wrap gap-2 max-h-44 overflow-y-auto filter-options">
                    <button v-for="genre in filterOptions.genres" :key="genre" @click="toggleFilter('genres', genre)" class="chip filter-item" :class="filters.genres.includes(genre) ? 'chip-active' : ''">
                      {{ genre }}
                    </button>
                  </div>
                </div>

                <!-- Styles Filter -->
                <div v-if="filterOptions.styles.length > 0" class="mb-7">
                  <p class="eyebrow mb-3">Styles</p>
                  <div class="flex flex-wrap gap-2 max-h-44 overflow-y-auto filter-options">
                    <button v-for="style in filterOptions.styles" :key="style" @click="toggleFilter('styles', style)" class="chip filter-item" :class="filters.styles.includes(style) ? 'chip-active' : ''">
                      {{ style }}
                    </button>
                  </div>
                </div>

                <!-- Countries Filter -->
                <div v-if="filterOptions.countries.length > 0" class="mb-7">
                  <p class="eyebrow mb-3">Countries</p>
                  <div class="flex flex-wrap gap-2 max-h-44 overflow-y-auto filter-options">
                    <button v-for="country in filterOptions.countries" :key="country" @click="toggleFilter('countries', country)" class="chip filter-item" :class="filters.countries.includes(country) ? 'chip-active' : ''">
                      {{ country }}
                    </button>
                  </div>
                </div>

                <!-- Labels Filter -->
                <div v-if="filterOptions.labels.length > 0" class="mb-2">
                  <p class="eyebrow mb-3">Labels</p>
                  <div class="flex flex-wrap gap-2 max-h-44 overflow-y-auto filter-options">
                    <button v-for="label in filterOptions.labels.slice(0, 50)" :key="label" @click="toggleFilter('labels', label)" class="chip filter-item" :class="filters.labels.includes(label) ? 'chip-active' : ''">
                      {{ label }}
                    </button>
                  </div>
                  <p v-if="filterOptions.labels.length > 50" class="text-xs mt-2" style="color: var(--text-tertiary);">
                    Showing first 50 labels. Use search to find specific labels.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div class="p-4" style="border-top: 1px solid var(--border-subtle);">
                <button @click="showFilters = false" class="btn-primary w-full">Show results</button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Collection Grid -->
    <main class="py-2">
      <!-- Loading State -->
      <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
        <div v-for="i in 14" :key="i" class="space-y-2">
          <div class="aspect-square skeleton rounded-xl"></div>
          <div class="h-3 w-3/4 skeleton rounded"></div>
          <div class="h-3 w-1/2 skeleton rounded"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="hasError && records.length === 0" class="flex items-center justify-center min-h-[50vh]">
        <div class="text-center max-w-sm scale-in px-4">
          <div class="w-20 h-20 mx-auto surface flex items-center justify-center mb-6">
            <svg class="w-9 h-9" style="color: var(--accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 class="display text-2xl mb-3">Couldn't load your collection</h3>
          <p class="text-sm mb-6" style="color: var(--text-secondary);">Check your connection and try again.</p>
          <button @click="fetchRecords(true)" class="btn-primary inline-flex">Retry</button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="records.length === 0" class="flex items-center justify-center min-h-[50vh]">
        <div class="text-center max-w-sm scale-in px-4">
          <div class="w-20 h-20 mx-auto surface flex items-center justify-center mb-6">
            <svg class="w-9 h-9" style="color: var(--accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
            </svg>
          </div>
          <h3 class="display text-2xl mb-3">
            {{ search || activeFiltersCount ? 'No records found' : 'Your collection awaits' }}
          </h3>
          <p class="text-sm mb-6" style="color: var(--text-secondary);">
            {{ search || activeFiltersCount ? 'Try adjusting your search or filters' : 'Start building your digital crate.' }}
          </p>
          <NuxtLink v-if="!search && !activeFiltersCount" to="/collection/add" class="btn-primary inline-flex">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" d="M12 5v14M5 12h14"></path></svg>
            Add your first record
          </NuxtLink>
        </div>
      </div>

      <!-- Records Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
        <NuxtLink
          v-for="(record, index) in records"
          :key="record.id"
          :to="`/collection/${record.id}`"
          class="group stagger-item album-glow"
          :style="{ animationDelay: `${Math.min(index, 20) * 20}ms` }"
        >
          <div class="relative">
            <!-- Album Cover -->
            <div class="aspect-square rounded-xl relative overflow-hidden" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle);">
              <!-- Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"></div>

              <!-- Play Button -->
              <div class="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div class="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform duration-300" style="background: var(--accent);">
                  <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>

              <img
                v-if="record.release.coverUrl || record.release.thumbUrl"
                :src="record.release.coverUrl || record.release.thumbUrl"
                :alt="record.release.title"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-8 h-8" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
              </div>
            </div>

            <!-- Record Info -->
            <div class="mt-2.5 space-y-0.5">
              <p class="font-semibold text-sm group-hover:text-[var(--accent)] transition-colors duration-200 truncate leading-tight" style="color: var(--text-primary);">
                {{ record.release.artist || 'Unknown Artist' }}
              </p>
              <p class="text-xs truncate leading-tight" style="color: var(--text-secondary);">
                {{ record.release.title }}
              </p>
              <div class="flex items-center gap-1.5 text-xs pt-0.5">
                <span v-if="record.release.year" class="font-mono" style="color: var(--text-tertiary);">{{ record.release.year }}</span>
                <span v-if="record.release.year && record.release.formats?.length" style="color: var(--text-tertiary);">·</span>
                <span v-if="record.release.formats?.length" class="truncate" style="color: var(--text-tertiary);">{{ record.release.formats[0] }}</span>
              </div>

              <!-- DJ Metadata -->
              <div v-if="record.bpm || record.key || record.energy" class="flex flex-wrap items-center gap-1 pt-1">
                <span v-if="record.bpm" class="chip !px-1.5 !py-0.5 !text-[10px] font-mono">{{ record.bpm }} BPM</span>
                <span v-if="record.key" class="chip !px-1.5 !py-0.5 !text-[10px] font-mono">{{ record.key }}</span>
                <span v-if="record.energy" class="chip !px-1.5 !py-0.5 !text-[10px] font-mono">E{{ record.energy }}</span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Load More Indicator -->
      <div v-if="isLoadingMore" class="flex items-center justify-center py-10">
        <div class="text-center">
          <div class="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" style="border-color: var(--accent); border-top-color: transparent;"></div>
          <p class="text-sm" style="color: var(--text-tertiary);">Loading more…</p>
        </div>
      </div>

      <!-- End of List Indicator -->
      <div v-else-if="!hasMore && records.length > 0" class="flex items-center justify-center py-10">
        <p class="text-sm" style="color: var(--text-tertiary);">You've reached the end of your collection.</p>
      </div>
    </main>
  </div>
</template>
