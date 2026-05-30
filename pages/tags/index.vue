<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
    <!-- Header -->
    <div class="flex items-end justify-between gap-4 py-8">
      <div>
        <p class="eyebrow mb-2">DJ tools</p>
        <h1 class="display text-4xl">Tags</h1>
        <p class="mt-2 text-sm" style="color: var(--text-secondary);">Create and manage custom tags for organizing your tracks.</p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" d="M12 5v14M5 12h14"></path></svg>
        New tag
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="surface p-5">
        <div class="h-6 skeleton rounded w-2/3 mb-3"></div>
        <div class="h-4 skeleton rounded w-1/3"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="tags.length === 0" class="text-center py-24">
      <div class="w-20 h-20 surface rounded-2xl flex items-center justify-center mx-auto mb-5">
        <svg class="w-9 h-9" style="color: var(--accent);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
      <h3 class="display text-2xl mb-2">No tags yet</h3>
      <p class="mb-6" style="color: var(--text-secondary);">Create tags to organize and categorize your tracks.</p>
      <button @click="showCreateModal = true" class="btn-primary inline-flex">Create your first tag</button>
    </div>

    <!-- Tags Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div v-for="tag in tags" :key="tag.id" class="surface glass-hover p-5 flex flex-col">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            <span class="w-3.5 h-3.5 rounded-full flex-shrink-0" :style="{ backgroundColor: tag.color || '#ff4d3d' }"></span>
            <h3 class="text-lg font-semibold truncate" style="color: var(--text-primary);">{{ tag.name }}</h3>
          </div>
          <button @click="openDeleteModal(tag)" class="icon-danger flex-shrink-0" aria-label="Delete tag">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <p v-if="tag.description" class="text-sm mb-3 line-clamp-2" style="color: var(--text-secondary);">{{ tag.description }}</p>

        <div class="mt-auto pt-3" style="border-top: 1px solid var(--border-subtle);">
          <div class="text-sm font-mono" style="color: var(--text-tertiary);">
            {{ tag._count.trackTags }} {{ tag._count.trackTags === 1 ? 'track' : 'tracks' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Create Tag Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" @click="showCreateModal = false">
        <div class="surface max-w-md w-full p-6 scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <h2 class="display text-2xl mb-5">Create tag</h2>

          <form @submit.prevent="createTag" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Name *</label>
              <input v-model="newTag.name" type="text" required class="input w-full px-4 py-3" placeholder="e.g. Peak Time, Opening, Closing" />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Description</label>
              <textarea v-model="newTag.description" rows="3" class="input w-full px-4 py-3 resize-none" placeholder="What does this tag represent?"></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Color</label>
              <div class="grid grid-cols-8 gap-2 mb-3">
                <button
                  v-for="color in colorPresets"
                  :key="color"
                  type="button"
                  @click="newTag.color = color"
                  class="w-9 h-9 rounded-lg transition-transform hover:scale-110"
                  :class="{ 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-secondary)]': newTag.color === color }"
                  :style="{ backgroundColor: color }"
                ></button>
              </div>
              <input v-model="newTag.color" type="text" placeholder="#ff4d3d" class="input w-full px-4 py-2.5 font-mono text-sm" />
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">Cancel</button>
              <button type="submit" :disabled="isCreating" class="btn-primary">{{ isCreating ? 'Creating…' : 'Create tag' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" @click="showDeleteModal = false">
        <div class="surface max-w-md w-full p-6 scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <h2 class="display text-2xl mb-3">Delete tag</h2>
          <p class="mb-6" style="color: var(--text-secondary);">
            Are you sure you want to delete "<span style="color: var(--text-primary);">{{ tagToDelete?.name }}</span>"? This will remove the tag from all tracks.
          </p>
          <div class="flex justify-end gap-3">
            <button @click="showDeleteModal = false" class="btn-secondary">Cancel</button>
            <button @click="deleteTag" :disabled="isDeleting" class="btn-primary" style="background: #e23b2c;">{{ isDeleting ? 'Deleting…' : 'Delete' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Tag {
  id: string
  name: string
  color: string | null
  description: string | null
  createdAt: string
  _count: {
    trackTags: number
  }
}

const tags = ref<Tag[]>([])
const isLoading = ref(true)
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const isCreating = ref(false)
const isDeleting = ref(false)
const tagToDelete = ref<Tag | null>(null)

const newTag = ref({
  name: '',
  description: '',
  color: '#ff4d3d',
})

const colorPresets = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#EAB308', // yellow
  '#84CC16', // lime
  '#22C55E', // green
  '#10B981', // emerald
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#0EA5E9', // sky
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#D946EF', // fuchsia
  '#EC4899', // pink
]

async function fetchTags() {
  isLoading.value = true
  try {
    const response = await $fetch('/api/tags')
    tags.value = response.tags
  } catch (error) {
    console.error('Failed to fetch tags:', error)
  } finally {
    isLoading.value = false
  }
}

async function createTag() {
  if (!newTag.value.name.trim()) return

  isCreating.value = true
  try {
    const payload: any = {
      name: newTag.value.name.trim()
    }

    if (newTag.value.description?.trim()) {
      payload.description = newTag.value.description.trim()
    }
    if (newTag.value.color?.trim()) {
      payload.color = newTag.value.color.trim()
    }

    await $fetch('/api/tags/create', {
      method: 'POST',
      body: payload
    })

    await fetchTags()
    showCreateModal.value = false
    newTag.value = {
      name: '',
      description: '',
      color: '#6366F1',
    }
  } catch (error: any) {
    console.error('Failed to create tag:', error)
    if (error.statusCode === 400) {
      alert('A tag with this name already exists')
    } else {
      alert('Failed to create tag')
    }
  } finally {
    isCreating.value = false
  }
}

function openDeleteModal(tag: Tag) {
  tagToDelete.value = tag
  showDeleteModal.value = true
}

async function deleteTag() {
  if (!tagToDelete.value) return

  isDeleting.value = true
  try {
    await $fetch(`/api/tags/${tagToDelete.value.id}`, {
      method: 'DELETE'
    })

    tags.value = tags.value.filter(t => t.id !== tagToDelete.value!.id)
    showDeleteModal.value = false
    tagToDelete.value = null
  } catch (error) {
    console.error('Failed to delete tag:', error)
    alert('Failed to delete tag')
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  fetchTags()
})
</script>
