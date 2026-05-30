<script setup lang="ts">
/**
 * Collection statistics page
 */

const stats = ref<any>(null)
const isLoading = ref(true)
const hasError = ref(false)

async function fetchStats() {
  isLoading.value = true
  hasError.value = false
  try {
    const response = await $fetch('/api/stats')
    stats.value = response.stats
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    hasError.value = true
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
    <!-- Header -->
    <div class="py-8">
      <p class="eyebrow mb-2">Insights</p>
      <h1 class="display text-4xl">Collection stats</h1>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="surface p-5">
        <div class="h-4 skeleton rounded w-1/2 mb-3"></div>
        <div class="h-8 skeleton rounded w-1/3"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="hasError" class="text-center py-24">
      <div class="w-20 h-20 surface rounded-2xl flex items-center justify-center mx-auto mb-5">
        <svg class="w-9 h-9" style="color: var(--accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h3 class="display text-2xl mb-2">Couldn't load stats</h3>
      <p class="text-sm mb-6" style="color: var(--text-secondary);">Something went wrong fetching your collection insights.</p>
      <button @click="fetchStats" class="btn-primary inline-flex">Try again</button>
    </div>

    <!-- Stats Content -->
    <div v-else-if="stats">
      <!-- Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div class="surface p-6">
          <p class="eyebrow mb-3">Total records</p>
          <p class="display text-5xl">{{ stats.totalRecords }}</p>
        </div>
        <div class="surface p-6">
          <p class="eyebrow mb-3">Total shelves</p>
          <p class="display text-5xl">{{ stats.totalShelves }}</p>
        </div>
        <div class="surface p-6">
          <p class="eyebrow mb-3">Added this week</p>
          <p class="display text-5xl" style="color: var(--accent);">{{ stats.recentAdditions }}</p>
        </div>
      </div>

      <!-- Top Lists -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Top Genres -->
        <div class="surface p-6">
          <h2 class="display text-lg mb-5">Top genres</h2>
          <div v-if="stats.topGenres.length > 0" class="space-y-3.5">
            <div v-for="(item, index) in stats.topGenres" :key="index" class="flex items-center gap-3">
              <span class="text-xs font-mono w-5" style="color: var(--text-tertiary);">{{ index + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate mb-1.5" style="color: var(--text-primary);">{{ item.genre }}</p>
                <div class="w-full rounded-full h-1.5" style="background: var(--bg-tertiary);">
                  <div class="h-1.5 rounded-full" style="background: var(--accent);" :style="{ width: `${(item.count / (stats.totalRecords || 1)) * 100}%` }"></div>
                </div>
              </div>
              <span class="text-sm font-semibold font-mono" style="color: var(--text-secondary);">{{ item.count }}</span>
            </div>
          </div>
          <p v-else class="text-sm" style="color: var(--text-tertiary);">No genre data available</p>
        </div>

        <!-- Top Artists -->
        <div class="surface p-6">
          <h2 class="display text-lg mb-5">Top artists</h2>
          <div v-if="stats.topArtists.length > 0" class="space-y-1">
            <div v-for="(item, index) in stats.topArtists" :key="index" class="flex items-center justify-between gap-3 py-1.5">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="text-xs font-mono w-5" style="color: var(--text-tertiary);">{{ index + 1 }}</span>
                <p class="text-sm font-medium truncate" style="color: var(--text-primary);">{{ item.artist }}</p>
              </div>
              <span class="text-sm font-semibold font-mono" style="color: var(--text-secondary);">{{ item.count }}</span>
            </div>
          </div>
          <p v-else class="text-sm" style="color: var(--text-tertiary);">No artist data available</p>
        </div>

        <!-- Top Labels -->
        <div class="surface p-6">
          <h2 class="display text-lg mb-5">Top labels</h2>
          <div v-if="stats.topLabels.length > 0" class="space-y-1">
            <div v-for="(item, index) in stats.topLabels" :key="index" class="flex items-center justify-between gap-3 py-1.5">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="text-xs font-mono w-5" style="color: var(--text-tertiary);">{{ index + 1 }}</span>
                <p class="text-sm font-medium truncate" style="color: var(--text-primary);">{{ item.label }}</p>
              </div>
              <span class="text-sm font-semibold font-mono" style="color: var(--text-secondary);">{{ item.count }}</span>
            </div>
          </div>
          <p v-else class="text-sm" style="color: var(--text-tertiary);">No label data available</p>
        </div>

        <!-- By Decade -->
        <div class="surface p-6">
          <h2 class="display text-lg mb-5">By decade</h2>
          <div v-if="stats.byDecade.length > 0" class="space-y-3.5">
            <div v-for="(item, index) in stats.byDecade" :key="index" class="flex items-center gap-3">
              <p class="text-sm font-medium font-mono w-14" style="color: var(--text-primary);">{{ item.decade }}</p>
              <div class="flex-1">
                <div class="w-full rounded-full h-1.5" style="background: var(--bg-tertiary);">
                  <div class="h-1.5 rounded-full" style="background: var(--accent);" :style="{ width: `${(item.count / (stats.totalRecords || 1)) * 100}%` }"></div>
                </div>
              </div>
              <span class="text-sm font-semibold font-mono" style="color: var(--text-secondary);">{{ item.count }}</span>
            </div>
          </div>
          <p v-else class="text-sm" style="color: var(--text-tertiary);">No decade data available</p>
        </div>
      </div>
    </div>
  </div>
</template>
