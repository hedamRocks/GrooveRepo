<script setup lang="ts">
/**
 * Collection statistics page
 */

const stats = ref<any>(null)
const isLoading = ref(true)

async function fetchStats() {
  isLoading.value = true
  try {
    const response = await $fetch('/api/stats')
    stats.value = response.stats
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div class="min-h-screen bg-black pb-32">
    <div class="max-w-7xl mx-auto px-4">
      <!-- Compact Header -->
      <div class="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/10 px-4 py-2 -mx-4">
        <h1 class="text-base font-bold text-white">Collection Stats</h1>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
        <div v-for="i in 6" :key="i" class="glass p-4 animate-pulse">
          <div class="h-4 bg-white/10 rounded w-1/2 mb-3"></div>
          <div class="h-8 bg-white/10 rounded w-1/3"></div>
        </div>
      </div>

      <!-- Stats Content -->
      <div v-else-if="stats" class="pt-4">
        <!-- Overview Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div class="glass p-4">
            <p class="text-xs font-medium text-gray-400 mb-2">Total Records</p>
            <p class="text-3xl font-bold text-white">{{ stats.totalRecords }}</p>
          </div>

          <div class="glass p-4">
            <p class="text-xs font-medium text-gray-400 mb-2">Total Shelves</p>
            <p class="text-3xl font-bold text-white">{{ stats.totalShelves }}</p>
          </div>

          <div class="glass p-4">
            <p class="text-xs font-medium text-gray-400 mb-2">Added This Week</p>
            <p class="text-3xl font-bold text-white">{{ stats.recentAdditions }}</p>
          </div>
        </div>

        <!-- Top Lists -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Top Genres -->
          <div class="glass p-4">
            <h2 class="text-base font-bold text-white mb-4">Top Genres</h2>
            <div v-if="stats.topGenres.length > 0" class="space-y-3">
              <div
                v-for="(item, index) in stats.topGenres"
                :key="index"
                class="flex items-center gap-3"
              >
                <span class="text-xs font-medium text-gray-500 w-5">{{ index + 1 }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-white truncate mb-1">{{ item.genre }}</p>
                  <div class="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      class="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                      :style="{ width: `${(item.count / stats.totalRecords) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <span class="text-sm font-semibold text-gray-400">{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500">No genre data available</p>
          </div>

          <!-- Top Artists -->
          <div class="glass p-4">
            <h2 class="text-base font-bold text-white mb-4">Top Artists</h2>
            <div v-if="stats.topArtists.length > 0" class="space-y-2.5">
              <div
                v-for="(item, index) in stats.topArtists"
                :key="index"
                class="flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <span class="text-xs font-medium text-gray-500 w-5">{{ index + 1 }}</span>
                  <p class="text-sm font-medium text-white truncate">{{ item.artist }}</p>
                </div>
                <span class="text-sm font-semibold text-gray-400">{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500">No artist data available</p>
          </div>

          <!-- Top Labels -->
          <div class="glass p-4">
            <h2 class="text-base font-bold text-white mb-4">Top Labels</h2>
            <div v-if="stats.topLabels.length > 0" class="space-y-2.5">
              <div
                v-for="(item, index) in stats.topLabels"
                :key="index"
                class="flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <span class="text-xs font-medium text-gray-500 w-5">{{ index + 1 }}</span>
                  <p class="text-sm font-medium text-white truncate">{{ item.label }}</p>
                </div>
                <span class="text-sm font-semibold text-gray-400">{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500">No label data available</p>
          </div>

          <!-- By Decade -->
          <div class="glass p-4">
            <h2 class="text-base font-bold text-white mb-4">By Decade</h2>
            <div v-if="stats.byDecade.length > 0" class="space-y-3">
              <div
                v-for="(item, index) in stats.byDecade"
                :key="index"
                class="flex items-center gap-3"
              >
                <p class="text-sm font-medium text-white w-14">{{ item.decade }}</p>
                <div class="flex-1">
                  <div class="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      class="bg-gradient-to-r from-cyan-500 to-purple-500 h-1.5 rounded-full"
                      :style="{ width: `${(item.count / stats.totalRecords) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <span class="text-sm font-semibold text-gray-400">{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500">No decade data available</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 glass border-t" style="border-color: rgba(255, 255, 255, 0.1); background: var(--bg-secondary);">
      <div class="flex items-center justify-around px-2 py-2">
        <NuxtLink
          to="/collection"
          class="flex flex-col items-center gap-1 px-4 py-2 transition-colors group"
          active-class="text-cyan-400"
        >
          <svg class="w-5 h-5 group-[.router-link-active]:neon-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <span class="text-xs font-medium">Collection</span>
        </NuxtLink>

        <NuxtLink
          to="/shelves"
          class="flex flex-col items-center gap-1 px-4 py-2 transition-colors group"
          active-class="text-cyan-400"
        >
          <svg class="w-5 h-5 group-[.router-link-active]:neon-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
          </svg>
          <span class="text-xs font-medium">Shelves</span>
        </NuxtLink>

        <NuxtLink
          to="/setlists"
          class="flex flex-col items-center gap-1 px-4 py-2 transition-colors group"
          active-class="text-cyan-400"
        >
          <svg class="w-5 h-5 group-[.router-link-active]:neon-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
          <span class="text-xs font-medium">Setlists</span>
        </NuxtLink>

        <NuxtLink
          to="/stats"
          class="flex flex-col items-center gap-1 px-4 py-2 transition-colors group"
          active-class="text-cyan-400"
        >
          <svg class="w-5 h-5 group-[.router-link-active]:neon-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <span class="text-xs font-medium">Stats</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
