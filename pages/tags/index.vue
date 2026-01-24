<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Tags</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create and manage custom tags for organizing your tracks
          </p>
        </div>
        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Tag
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="tags.length === 0" class="text-center py-20">
        <div class="text-gray-400 dark:text-gray-600 mb-4">
          <svg class="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No tags yet</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Create tags to organize and categorize your tracks</p>
        <button
          @click="showCreateModal = true"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Your First Tag
        </button>
      </div>

      <!-- Tags Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="tag in tags"
          :key="tag.id"
          class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col"
        >
          <!-- Tag Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center space-x-2 flex-1 min-w-0">
              <div
                class="w-8 h-8 rounded flex-shrink-0"
                :style="{ backgroundColor: tag.color || '#6B7280' }"
              ></div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {{ tag.name }}
              </h3>
            </div>
            <button
              @click="openDeleteModal(tag)"
              class="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <!-- Description -->
          <p v-if="tag.description" class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {{ tag.description }}
          </p>

          <!-- Track Count -->
          <div class="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ tag._count.trackTags }} {{ tag._count.trackTags === 1 ? 'track' : 'tracks' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Tag Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showCreateModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        @click.stop
      >
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Tag</h2>

          <form @submit.prevent="createTag">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  v-model="newTag.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Peak Time, Opening, Closing"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  v-model="newTag.description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What does this tag represent?"
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div class="grid grid-cols-8 gap-2 mb-2">
                  <button
                    v-for="color in colorPresets"
                    :key="color"
                    type="button"
                    @click="newTag.color = color"
                    class="w-10 h-10 rounded transition-transform hover:scale-110"
                    :class="{ 'ring-2 ring-blue-500 ring-offset-2': newTag.color === color }"
                    :style="{ backgroundColor: color }"
                  ></button>
                </div>
                <input
                  v-model="newTag.color"
                  type="text"
                  placeholder="#6366F1"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                {{ isCreating ? 'Creating...' : 'Create Tag' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showDeleteModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        @click.stop
      >
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete Tag</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete "{{ tagToDelete?.name }}"? This will remove the tag from all tracks.
          </p>
          <div class="flex justify-end space-x-3">
            <button
              @click="showDeleteModal = false"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              @click="deleteTag"
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
  color: '#6366F1',
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
