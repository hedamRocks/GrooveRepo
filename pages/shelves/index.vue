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
const newShelfColor = ref('#ff4d3d') // Default coral

const colorOptions = [
  '#ff4d3d', // coral
  '#fb923c', // orange
  '#fbbf24', // yellow
  '#34d399', // green
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#a78bfa', // purple
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
    newShelfColor.value = '#ff4d3d'
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
  <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
    <!-- Header -->
    <div class="flex items-end justify-between gap-4 py-8">
      <div>
        <p class="eyebrow mb-2">Organize</p>
        <h1 class="display text-4xl">Shelves <span class="text-[var(--text-tertiary)] text-2xl font-normal">{{ shelves.length }}</span></h1>
      </div>
      <button @click="showCreateModal = true" class="btn-primary shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" d="M12 5v14M5 12h14"></path></svg>
        New shelf
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="surface p-5">
        <div class="h-5 skeleton rounded w-3/4 mb-3"></div>
        <div class="h-4 skeleton rounded w-1/2"></div>
      </div>
    </div>

    <!-- Shelves Grid -->
    <div v-else-if="shelves.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="shelf in shelves"
        :key="shelf.id"
        :to="`/shelves/${shelf.id}`"
        class="surface glass-hover p-5 relative overflow-hidden"
      >
        <div class="absolute left-0 top-0 bottom-0 w-1" :style="{ backgroundColor: shelf.color || '#ff4d3d' }"></div>
        <div class="flex items-start justify-between mb-2 pl-1">
          <h3 class="text-lg font-semibold flex-1 truncate" style="color: var(--text-primary);">{{ shelf.name }}</h3>
          <span class="w-3 h-3 rounded-full flex-shrink-0 ml-2 mt-1.5" :style="{ backgroundColor: shelf.color || '#ff4d3d' }"></span>
        </div>
        <p v-if="shelf.description" class="text-sm mb-4 line-clamp-2 pl-1" style="color: var(--text-secondary);">{{ shelf.description }}</p>
        <div class="flex items-center gap-2 text-xs pl-1" style="color: var(--text-tertiary);">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
          </svg>
          {{ shelf._count.placements }} {{ shelf._count.placements === 1 ? 'record' : 'records' }}
        </div>
      </NuxtLink>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div class="w-20 h-20 rounded-2xl surface flex items-center justify-center mb-5">
        <svg class="w-9 h-9" style="color: var(--accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
        </svg>
      </div>
      <h3 class="display text-2xl mb-2">No shelves yet</h3>
      <p class="text-sm mb-6" style="color: var(--text-secondary);">Create your first shelf to organize your collection.</p>
      <button @click="showCreateModal = true" class="btn-primary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" d="M12 5v14M5 12h14"></path></svg>
        Create shelf
      </button>
    </div>

    <!-- Create Shelf Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
        @click.self="showCreateModal = false"
      >
        <div class="surface max-w-md w-full p-6 scale-in" style="box-shadow: var(--shadow-lg);">
          <div class="flex items-center justify-between mb-6">
            <h2 class="display text-2xl">Create shelf</h2>
            <button @click="showCreateModal = false" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06]" style="color: var(--text-secondary);">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <form @submit.prevent="createShelf" class="space-y-5">
            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Name</label>
              <input v-model="newShelfName" type="text" required placeholder="e.g. Favorites, Electronic, Chill vibes" class="input w-full px-4 py-3" />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Description <span style="color: var(--text-tertiary);">(optional)</span></label>
              <textarea v-model="newShelfDescription" rows="2" placeholder="What's this shelf for?" class="input w-full px-4 py-3 resize-none"></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Color</label>
              <div class="flex flex-wrap gap-2.5">
                <button
                  v-for="color in colorOptions"
                  :key="color"
                  type="button"
                  @click="newShelfColor = color"
                  class="w-10 h-10 rounded-xl transition-all"
                  :class="newShelfColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-secondary)]' : 'opacity-80 hover:opacity-100'"
                  :style="{ backgroundColor: color }"
                ></button>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" @click="showCreateModal = false" class="btn-secondary flex-1">Cancel</button>
              <button type="submit" :disabled="isCreating || !newShelfName.trim()" class="btn-primary flex-1">
                {{ isCreating ? 'Creating…' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
