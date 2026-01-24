<template>
  <div class="min-h-screen bg-black pb-32">
    <!-- Compact Header -->
    <header class="glass sticky top-0 z-50 border-b border-white/10" style="background: var(--bg-secondary);">
      <div class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h1 class="text-base font-bold gradient-text">Setlists</h1>
            <span class="font-mono text-xs neon-text">{{ setlists.length }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-4 py-6">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="setlists.length === 0" class="flex flex-col items-center justify-center py-20 px-4">
        <div class="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <svg class="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-white mb-2">No setlists yet</h3>
        <p class="text-sm text-gray-500 mb-6 text-center max-w-xs">Create your first setlist to organize tracks for your gigs</p>
      </div>

      <!-- Setlists Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="setlist in setlists"
          :key="setlist.id"
          @click="goToSetlist(setlist.id)"
          class="glass glass-hover p-4 cursor-pointer transition-all hover:scale-[1.02]"
        >
          <!-- Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-semibold text-white mb-1 truncate">
                {{ setlist.name }}
              </h3>
              <p v-if="setlist.description" class="text-xs text-gray-400 line-clamp-2">
                {{ setlist.description }}
              </p>
            </div>
            <button
              @click.stop="openDeleteModal(setlist)"
              class="p-1.5 text-gray-500 hover:text-red-500 hover:bg-white/5 rounded-lg transition-all flex-shrink-0 ml-2"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <!-- Metadata -->
          <div class="space-y-1.5 mb-3">
            <div v-if="setlist.venue" class="flex items-center text-xs text-gray-400">
              <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {{ setlist.venue }}
            </div>
            <div v-if="setlist.date" class="flex items-center text-xs text-gray-400">
              <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ formatDate(setlist.date) }}
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between pt-3 border-t border-white/10">
            <div class="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-400 font-medium">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              {{ setlist._count.tracks }}
            </div>
            <div class="text-xs text-gray-500">
              {{ formatRelativeTime(setlist.updatedAt) }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Fixed Create Button -->
    <div class="fixed bottom-16 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none">
      <div class="max-w-7xl mx-auto pointer-events-auto">
        <button
          @click="showCreateModal = true"
          class="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-base font-semibold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Setlist
        </button>
      </div>
    </div>

    <!-- Fixed Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 glass border-t" style="border-color: rgba(255, 255, 255, 0.1); background: var(--bg-secondary);">
      <div class="flex items-center justify-around px-2 py-2">
        <!-- Collection -->
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

        <!-- Shelves -->
        <NuxtLink
          to="/shelves"
          class="flex flex-col items-center gap-1 px-4 py-2 transition-colors group"
          active-class="text-cyan-400"
        >
          <svg class="w-5 h-5 group-[.router-link-active]:neon-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
          </svg>
          <span class="text-xs font-medium">Shelves</span>
        </NuxtLink>

        <!-- Setlists -->
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

        <!-- Stats -->
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

    <!-- Create Setlist Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="showCreateModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        @click.stop
      >
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Setlist</h2>

          <form @submit.prevent="createSetlist">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  v-model="newSetlist.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Summer Festival 2026"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  v-model="newSetlist.description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Opening set, peak time, closing..."
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Venue
                </label>
                <input
                  v-model="newSetlist.venue"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Club XYZ"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  v-model="newSetlist.date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  v-model.number="newSetlist.duration"
                  type="number"
                  min="1"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="60"
                />
              </div>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="showCreateModal = false"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isCreating"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {{ isCreating ? 'Creating...' : 'Create Setlist' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="showDeleteModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        @click.stop
      >
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete Setlist</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete "{{ setlistToDelete?.name }}"? This action cannot be undone.
          </p>
          <div class="flex justify-end space-x-3">
            <button
              @click="showDeleteModal = false"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              @click="deleteSetlist"
              :disabled="isDeleting"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {{ isDeleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Setlist {
  id: string
  name: string
  description: string | null
  venue: string | null
  date: string | null
  duration: number | null
  createdAt: string
  updatedAt: string
  _count: {
    tracks: number
  }
}

const setlists = ref<Setlist[]>([])
const isLoading = ref(true)
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const isCreating = ref(false)
const isDeleting = ref(false)
const setlistToDelete = ref<Setlist | null>(null)

const newSetlist = ref({
  name: '',
  description: '',
  venue: '',
  date: '',
  duration: null as number | null,
})

async function fetchSetlists() {
  isLoading.value = true
  try {
    const response = await $fetch('/api/setlists')
    setlists.value = response.setlists
  } catch (error) {
    console.error('Failed to fetch setlists:', error)
  } finally {
    isLoading.value = false
  }
}

async function createSetlist() {
  if (!newSetlist.value.name.trim()) return

  isCreating.value = true
  try {
    const payload: any = {
      name: newSetlist.value.name.trim()
    }

    if (newSetlist.value.description?.trim()) {
      payload.description = newSetlist.value.description.trim()
    }
    if (newSetlist.value.venue?.trim()) {
      payload.venue = newSetlist.value.venue.trim()
    }
    if (newSetlist.value.date) {
      payload.date = newSetlist.value.date
    }
    if (newSetlist.value.duration && newSetlist.value.duration > 0) {
      payload.duration = newSetlist.value.duration
    }

    const response = await $fetch('/api/setlists/create', {
      method: 'POST',
      body: payload
    })

    // Navigate to the new setlist
    router.push(`/setlists/${response.setlist.id}`)
  } catch (error) {
    console.error('Failed to create setlist:', error)
    alert('Failed to create setlist')
  } finally {
    isCreating.value = false
    showCreateModal.value = false
    newSetlist.value = {
      name: '',
      description: '',
      venue: '',
      date: '',
      duration: null,
    }
  }
}

function openDeleteModal(setlist: Setlist) {
  setlistToDelete.value = setlist
  showDeleteModal.value = true
}

async function deleteSetlist() {
  if (!setlistToDelete.value) return

  isDeleting.value = true
  try {
    await $fetch(`/api/setlists/${setlistToDelete.value.id}`, {
      method: 'DELETE'
    })

    // Remove from list
    setlists.value = setlists.value.filter(s => s.id !== setlistToDelete.value!.id)
    showDeleteModal.value = false
    setlistToDelete.value = null
  } catch (error) {
    console.error('Failed to delete setlist:', error)
    alert('Failed to delete setlist')
  } finally {
    isDeleting.value = false
  }
}

function goToSetlist(id: string) {
  router.push(`/setlists/${id}`)
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`
  return formatDate(dateString)
}

onMounted(() => {
  fetchSetlists()
})
</script>
