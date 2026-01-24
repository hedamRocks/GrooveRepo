<script setup lang="ts">
/**
 * Shelves overview - list all shelves and create new ones
 */

const router = useRouter()
const shelves = ref<any[]>([])
const isLoading = ref(true)
const isCreating = ref(false)

// Create shelf modal
const showCreateModal = ref(false)
const newShelfName = ref('')
const newShelfDescription = ref('')
const newShelfColor = ref('#a78bfa') // Default purple

const colorOptions = [
  '#a78bfa', // purple
  '#60a5fa', // blue
  '#34d399', // green
  '#fbbf24', // yellow
  '#f87171', // red
  '#fb923c', // orange
  '#ec4899', // pink
  '#a3a3a3', // gray
]

async function fetchShelves() {
  isLoading.value = true
  try {
    const response = await $fetch('/api/shelves')
    shelves.value = response.shelves
  } catch (error) {
    console.error('Failed to fetch shelves:', error)
  } finally {
    isLoading.value = false
  }
}

async function createShelf() {
  if (!newShelfName.value.trim()) return

  isCreating.value = true
  try {
    await $fetch('/api/shelves', {
      method: 'POST',
      body: {
        name: newShelfName.value,
        description: newShelfDescription.value,
        color: newShelfColor.value,
      }
    })

    // Reset form and close modal
    newShelfName.value = ''
    newShelfDescription.value = ''
    newShelfColor.value = '#a78bfa'
    showCreateModal.value = false

    // Refresh shelves
    await fetchShelves()
  } catch (error) {
    alert('Failed to create shelf')
  } finally {
    isCreating.value = false
  }
}

onMounted(() => {
  fetchShelves()
})
</script>

<template>
  <div class="min-h-screen bg-black pb-32">
    <div class="max-w-7xl mx-auto px-4">
      <!-- Compact Header -->
      <div class="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/10 px-4 py-2 -mx-4">
        <h1 class="text-base font-bold text-white">
          Shelves
          <span class="text-gray-500 text-sm font-normal ml-2">({{ shelves.length }})</span>
        </h1>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
        <div v-for="i in 6" :key="i" class="glass p-4 animate-pulse">
          <div class="h-5 bg-white/10 rounded w-3/4 mb-2"></div>
          <div class="h-4 bg-white/10 rounded w-1/2"></div>
        </div>
      </div>

      <!-- Shelves Grid -->
      <div v-else-if="shelves.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
        <NuxtLink
          v-for="shelf in shelves"
          :key="shelf.id"
          :to="`/shelves/${shelf.id}`"
          class="glass glass-hover p-4 transition-all hover:scale-[1.02] border-l-2"
          :style="{ borderLeftColor: shelf.color || '#a78bfa' }"
        >
          <div class="flex items-start justify-between mb-2">
            <h3 class="text-base font-semibold text-white flex-1 truncate">{{ shelf.name }}</h3>
            <div
              class="w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 mt-1"
              :style="{ backgroundColor: shelf.color || '#a78bfa' }"
            ></div>
          </div>
          <p v-if="shelf.description" class="text-xs text-gray-400 mb-3 line-clamp-2">{{ shelf.description }}</p>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            {{ shelf._count.placements }} {{ shelf._count.placements === 1 ? 'record' : 'records' }}
          </div>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div v-else class="flex flex-col items-center justify-center py-20 px-4">
        <div class="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h3 class="text-base font-semibold text-white mb-2">No shelves yet</h3>
        <p class="text-sm text-gray-400 mb-6 text-center">Create your first shelf to organize your collection</p>
      </div>
    </div>

    <!-- Fixed Create Shelf Button -->
    <div class="fixed bottom-16 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none">
      <div class="max-w-7xl mx-auto pointer-events-auto">
        <button
          @click="showCreateModal = true"
          class="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 text-white text-base font-semibold rounded-xl hover:from-cyan-500 hover:to-purple-500 transition-all shadow-xl"
          style="box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
          </svg>
          Create Shelf
        </button>
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

    <!-- Create Shelf Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click.self="showCreateModal = false"
    >
      <div class="glass border border-white/20 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">Create Shelf</h2>
          <button
            @click="showCreateModal = false"
            class="text-gray-400 hover:text-white transition p-1 hover:bg-white/5 rounded-lg"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form @submit.prevent="createShelf" class="space-y-5">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              v-model="newShelfName"
              type="text"
              required
              placeholder="e.g., Favorites, Electronic, Chill vibes"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
            <textarea
              v-model="newShelfDescription"
              rows="2"
              placeholder="What's this shelf for?"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none resize-none transition"
            ></textarea>
          </div>

          <!-- Color -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Color</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in colorOptions"
                :key="color"
                type="button"
                @click="newShelfColor = color"
                class="w-11 h-11 rounded-lg border-2 transition-all"
                :class="newShelfColor === color ? 'border-white scale-110 shadow-lg' : 'border-white/20 hover:border-white/40'"
                :style="{ backgroundColor: color }"
              ></button>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showCreateModal = false"
              class="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isCreating || !newShelfName.trim()"
              class="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-lg hover:from-cyan-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-lg"
            >
              {{ isCreating ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
