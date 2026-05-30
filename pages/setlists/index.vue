<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
    <!-- Header -->
    <div class="flex items-end justify-between gap-4 py-8">
      <div>
        <p class="eyebrow mb-2">DJ tools</p>
        <h1 class="display text-4xl">Setlists <span class="text-[var(--text-tertiary)] text-2xl font-normal">{{ setlists.length }}</span></h1>
      </div>
      <button @click="showCreateModal = true" class="btn-primary shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" d="M12 5v14M5 12h14" /></svg>
        New setlist
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="surface p-5">
        <div class="h-5 skeleton rounded w-2/3 mb-3"></div>
        <div class="h-4 skeleton rounded w-1/3"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="setlists.length === 0" class="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div class="w-20 h-20 surface rounded-2xl flex items-center justify-center mb-5">
        <svg class="w-9 h-9" style="color: var(--accent);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
      <h3 class="display text-2xl mb-2">No setlists yet</h3>
      <p class="text-sm mb-6 max-w-xs" style="color: var(--text-secondary);">Create your first setlist to organize tracks for your gigs.</p>
      <button @click="showCreateModal = true" class="btn-primary inline-flex">Create setlist</button>
    </div>

    <!-- Setlists Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="setlist in setlists"
        :key="setlist.id"
        @click="goToSetlist(setlist.id)"
        class="surface glass-hover p-5 cursor-pointer"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold mb-1 truncate" style="color: var(--text-primary);">{{ setlist.name }}</h3>
            <p v-if="setlist.description" class="text-sm line-clamp-2" style="color: var(--text-secondary);">{{ setlist.description }}</p>
          </div>
          <button @click.stop="openDeleteModal(setlist)" class="icon-danger p-1.5 rounded-lg flex-shrink-0 ml-2" aria-label="Delete setlist">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div class="space-y-1.5 mb-3">
          <div v-if="setlist.venue" class="flex items-center text-xs" style="color: var(--text-secondary);">
            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {{ setlist.venue }}
          </div>
          <div v-if="setlist.date" class="flex items-center text-xs" style="color: var(--text-secondary);">
            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ formatDate(setlist.date) }}
          </div>
        </div>

        <div class="flex items-center justify-between pt-3" style="border-top: 1px solid var(--border-subtle);">
          <div class="chip chip-active !py-1 !px-2.5">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            {{ setlist._count.tracks }}
          </div>
          <div class="text-xs font-mono" style="color: var(--text-tertiary);">{{ formatRelativeTime(setlist.updatedAt) }}</div>
        </div>
      </div>
    </div>

    <!-- Create Setlist Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click="showCreateModal = false">
        <div class="surface max-w-md w-full p-6 scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <h2 class="display text-2xl mb-5">Create setlist</h2>

          <form @submit.prevent="createSetlist" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Name *</label>
              <input v-model="newSetlist.name" type="text" required class="input w-full px-4 py-3" placeholder="Summer Festival 2026" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Description</label>
              <textarea v-model="newSetlist.description" rows="2" class="input w-full px-4 py-3 resize-none" placeholder="Opening set, peak time, closing…"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Venue</label>
                <input v-model="newSetlist.venue" type="text" class="input w-full px-4 py-3" placeholder="Club XYZ" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Date</label>
                <input v-model="newSetlist.date" type="date" class="input w-full px-4 py-3" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Duration (minutes)</label>
              <input v-model.number="newSetlist.duration" type="number" min="1" class="input w-full px-4 py-3" placeholder="60" />
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">Cancel</button>
              <button type="submit" :disabled="isCreating" class="btn-primary">{{ isCreating ? 'Creating…' : 'Create' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click="showDeleteModal = false">
        <div class="surface max-w-md w-full p-6 scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <h2 class="display text-2xl mb-3">Delete setlist</h2>
          <p class="mb-6" style="color: var(--text-secondary);">
            Are you sure you want to delete "<span style="color: var(--text-primary);">{{ setlistToDelete?.name }}</span>"? This action cannot be undone.
          </p>
          <div class="flex justify-end gap-3">
            <button @click="showDeleteModal = false" class="btn-secondary">Cancel</button>
            <button @click="deleteSetlist" :disabled="isDeleting" class="btn-primary" style="background: #e23b2c;">{{ isDeleting ? 'Deleting…' : 'Delete' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
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
