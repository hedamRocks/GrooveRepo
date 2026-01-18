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
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Shelves</h1>
            <p class="text-gray-600">Organize your collection your way</p>
          </div>
          <button
            @click="showCreateModal = true"
            class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
          >
            Create Shelf
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="bg-white rounded-xl p-6 animate-pulse">
          <div class="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>

      <!-- Shelves Grid -->
      <div v-else-if="shelves.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NuxtLink
          v-for="shelf in shelves"
          :key="shelf.id"
          :to="`/shelves/${shelf.id}`"
          class="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 border-l-4"
          :style="{ borderColor: shelf.color || '#a78bfa' }"
        >
          <div class="flex items-start justify-between mb-2">
            <h3 class="text-xl font-semibold text-gray-900">{{ shelf.name }}</h3>
            <div
              class="w-3 h-3 rounded-full"
              :style="{ backgroundColor: shelf.color || '#a78bfa' }"
            ></div>
          </div>
          <p v-if="shelf.description" class="text-gray-600 text-sm mb-3">{{ shelf.description }}</p>
          <p class="text-gray-500 text-sm">
            {{ shelf._count.placements }} {{ shelf._count.placements === 1 ? 'record' : 'records' }}
          </p>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No shelves yet</h3>
        <p class="text-gray-600 mb-6">Create your first shelf to organize your collection</p>
        <button
          @click="showCreateModal = true"
          class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
        >
          Create your first shelf
        </button>
      </div>
    </div>

    <!-- Create Shelf Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showCreateModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold text-gray-900">Create Shelf</h2>
          <button
            @click="showCreateModal = false"
            class="text-gray-400 hover:text-gray-600 transition"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form @submit.prevent="createShelf" class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              v-model="newShelfName"
              type="text"
              required
              placeholder="e.g., Favorites, Electronic, Chill vibes"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
            <textarea
              v-model="newShelfDescription"
              rows="2"
              placeholder="What's this shelf for?"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
            ></textarea>
          </div>

          <!-- Color -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div class="flex gap-2">
              <button
                v-for="color in colorOptions"
                :key="color"
                type="button"
                @click="newShelfColor = color"
                class="w-10 h-10 rounded-lg border-2 transition"
                :class="newShelfColor === color ? 'border-gray-900 scale-110' : 'border-transparent'"
                :style="{ backgroundColor: color }"
              ></button>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showCreateModal = false"
              class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isCreating || !newShelfName.trim()"
              class="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {{ isCreating ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
