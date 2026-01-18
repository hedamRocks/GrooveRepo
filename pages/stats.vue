<script setup lang="ts">
/**
 * Collection statistics page
 */

const router = useRouter()
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
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="router.push('/collection')"
          class="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to collection
        </button>

        <h1 class="text-3xl font-bold text-gray-900 mb-2">Collection Stats</h1>
        <p class="text-gray-600">Insights about your vinyl collection</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="bg-white rounded-xl p-6 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div class="h-8 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>

      <!-- Stats Content -->
      <div v-else-if="stats">
        <!-- Overview Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-md p-6">
            <p class="text-sm font-medium text-gray-500 mb-2">Total Records</p>
            <p class="text-4xl font-bold text-gray-900">{{ stats.totalRecords }}</p>
          </div>

          <div class="bg-white rounded-xl shadow-md p-6">
            <p class="text-sm font-medium text-gray-500 mb-2">Total Shelves</p>
            <p class="text-4xl font-bold text-gray-900">{{ stats.totalShelves }}</p>
          </div>

          <div class="bg-white rounded-xl shadow-md p-6">
            <p class="text-sm font-medium text-gray-500 mb-2">Added This Week</p>
            <p class="text-4xl font-bold text-gray-900">{{ stats.recentAdditions }}</p>
          </div>
        </div>

        <!-- Top Lists -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Top Genres -->
          <div class="bg-white rounded-xl shadow-md p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Top Genres</h2>
            <div v-if="stats.topGenres.length > 0" class="space-y-3">
              <div
                v-for="(item, index) in stats.topGenres"
                :key="index"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-3 flex-1">
                  <span class="text-sm font-medium text-gray-400 w-6">{{ index + 1 }}</span>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">{{ item.genre }}</p>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        class="bg-purple-600 h-2 rounded-full"
                        :style="{ width: `${(item.count / stats.totalRecords) * 100}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
                <span class="text-sm font-semibold text-gray-700 ml-4">{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="text-gray-500 text-sm">No genre data available</p>
          </div>

          <!-- Top Artists -->
          <div class="bg-white rounded-xl shadow-md p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Top Artists</h2>
            <div v-if="stats.topArtists.length > 0" class="space-y-3">
              <div
                v-for="(item, index) in stats.topArtists"
                :key="index"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-3 flex-1">
                  <span class="text-sm font-medium text-gray-400 w-6">{{ index + 1 }}</span>
                  <p class="text-sm font-medium text-gray-900 truncate">{{ item.artist }}</p>
                </div>
                <span class="text-sm font-semibold text-gray-700 ml-4">{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="text-gray-500 text-sm">No artist data available</p>
          </div>

          <!-- Top Labels -->
          <div class="bg-white rounded-xl shadow-md p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Top Labels</h2>
            <div v-if="stats.topLabels.length > 0" class="space-y-3">
              <div
                v-for="(item, index) in stats.topLabels"
                :key="index"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-3 flex-1">
                  <span class="text-sm font-medium text-gray-400 w-6">{{ index + 1 }}</span>
                  <p class="text-sm font-medium text-gray-900 truncate">{{ item.label }}</p>
                </div>
                <span class="text-sm font-semibold text-gray-700 ml-4">{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="text-gray-500 text-sm">No label data available</p>
          </div>

          <!-- By Decade -->
          <div class="bg-white rounded-xl shadow-md p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">By Decade</h2>
            <div v-if="stats.byDecade.length > 0" class="space-y-3">
              <div
                v-for="(item, index) in stats.byDecade"
                :key="index"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-3 flex-1">
                  <p class="text-sm font-medium text-gray-900 w-16">{{ item.decade }}</p>
                  <div class="flex-1">
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div
                        class="bg-indigo-600 h-2 rounded-full"
                        :style="{ width: `${(item.count / stats.totalRecords) * 100}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
                <span class="text-sm font-semibold text-gray-700 ml-4">{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="text-gray-500 text-sm">No decade data available</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
