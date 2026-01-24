<template>
  <div>
    <!-- Current Tags -->
    <div v-if="trackTags.length > 0" class="flex flex-wrap gap-1 mb-2">
      <span
        v-for="trackTag in trackTags"
        :key="trackTag.id"
        class="inline-flex items-center px-2 py-1 text-xs font-medium text-white rounded group"
        :style="{ backgroundColor: trackTag.tag.color || '#6B7280' }"
      >
        {{ trackTag.tag.name }}
        <button
          @click.stop="removeTag(trackTag.id)"
          class="ml-1 hover:text-red-200 transition-colors"
          title="Remove tag"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
    </div>

    <!-- Add Tag Button -->
    <button
      @click="showTagSelector = true"
      class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
    >
      + Add Tag
    </button>

    <!-- Tag Modal -->
    <div
      v-if="showTagSelector"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="closeModal"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        @click.stop
      >
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Manage Tags</h3>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Create New Tag Form -->
          <div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Create new tag:</div>
            <div class="flex space-x-2">
              <input
                v-model="newTagName"
                type="text"
                placeholder="Tag name"
                class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @keydown.enter="createAndAddTag"
              />
              <input
                v-model="newTagColor"
                type="color"
                class="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                title="Tag color"
              />
              <button
                @click="createAndAddTag"
                :disabled="!newTagName.trim() || isCreatingTag"
                class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isCreatingTag ? '...' : 'Add' }}
              </button>
            </div>
          </div>

          <!-- Existing Tags -->
          <div>
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Or select existing tags:</div>

            <div v-if="isLoadingTags" class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>

            <div v-else-if="availableTags.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              No existing tags available.
            </div>

            <div v-else class="space-y-2 max-h-64 overflow-y-auto mb-4">
              <button
                v-for="tag in availableTags"
                :key="tag.id"
                @click="toggleTagSelection(tag.id)"
                class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500': selectedTagIds.includes(tag.id) }"
              >
                <div
                  class="w-5 h-5 rounded flex-shrink-0"
                  :style="{ backgroundColor: tag.color || '#6B7280' }"
                ></div>
                <span class="text-sm text-gray-900 dark:text-white flex-1">{{ tag.name }}</span>
                <svg v-if="selectedTagIds.includes(tag.id)" class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>

            <!-- Add Selected Button -->
            <button
              v-if="selectedTagIds.length > 0"
              @click="addSelectedTags"
              :disabled="isAddingTags"
              class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ isAddingTags ? 'Adding...' : `Add ${selectedTagIds.length} selected ${selectedTagIds.length === 1 ? 'tag' : 'tags'}` }}
            </button>
          </div>

          <!-- Done Button -->
          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              @click="closeModal"
              class="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface TrackTag {
  id: string
  tag: {
    id: string
    name: string
    color: string | null
  }
}

interface Tag {
  id: string
  name: string
  color: string | null
}

const props = defineProps<{
  trackId: string
  trackTags: TrackTag[]
}>()

const emit = defineEmits<{
  (e: 'tagsUpdated'): void
}>()

const showTagSelector = ref(false)
const allTags = ref<Tag[]>([])
const isLoadingTags = ref(false)
const isCreatingTag = ref(false)
const isAddingTags = ref(false)
const newTagName = ref('')
const newTagColor = ref('#6366F1')
const selectedTagIds = ref<string[]>([])

const availableTags = computed(() => {
  const assignedTagIds = props.trackTags.map(tt => tt.tag.id)
  return allTags.value.filter(tag => !assignedTagIds.includes(tag.id))
})

async function fetchTags() {
  isLoadingTags.value = true
  try {
    const response = await $fetch('/api/tags')
    allTags.value = response.tags
  } catch (error) {
    console.error('Failed to fetch tags:', error)
  } finally {
    isLoadingTags.value = false
  }
}

function closeModal() {
  showTagSelector.value = false
  newTagName.value = ''
  newTagColor.value = '#6366F1'
  selectedTagIds.value = []
}

function toggleTagSelection(tagId: string) {
  const index = selectedTagIds.value.indexOf(tagId)
  if (index === -1) {
    selectedTagIds.value.push(tagId)
  } else {
    selectedTagIds.value.splice(index, 1)
  }
}

async function addSelectedTags() {
  if (selectedTagIds.value.length === 0) return

  isAddingTags.value = true
  try {
    // Add all selected tags in parallel
    await Promise.all(
      selectedTagIds.value.map(tagId =>
        $fetch(`/api/tracks/${props.trackId}/tags/assign`, {
          method: 'POST',
          body: { tagId }
        })
      )
    )

    selectedTagIds.value = []
    emit('tagsUpdated')
  } catch (error) {
    console.error('Failed to add tags:', error)
    alert('Failed to add one or more tags')
  } finally {
    isAddingTags.value = false
  }
}

async function removeTag(trackTagId: string) {
  try {
    // Find the tag ID from the trackTag
    const trackTag = props.trackTags.find(tt => tt.id === trackTagId)
    if (!trackTag) return

    await $fetch(`/api/tracks/${props.trackId}/tags/remove`, {
      method: 'POST',
      body: { tagId: trackTag.tag.id }
    })

    emit('tagsUpdated')
  } catch (error) {
    console.error('Failed to remove tag:', error)
    alert('Failed to remove tag')
  }
}

async function createAndAddTag() {
  if (!newTagName.value.trim()) return

  isCreatingTag.value = true
  try {
    // Create the tag
    const createResponse = await $fetch('/api/tags/create', {
      method: 'POST',
      body: {
        name: newTagName.value.trim(),
        color: newTagColor.value
      }
    })

    // Add the newly created tag to the track
    await $fetch(`/api/tracks/${props.trackId}/tags/assign`, {
      method: 'POST',
      body: { tagId: createResponse.tag.id }
    })

    // Reset form and refresh tags
    newTagName.value = ''
    newTagColor.value = '#6366F1'
    await fetchTags()
    emit('tagsUpdated')
  } catch (error: any) {
    console.error('Failed to create and add tag:', error)
    if (error.statusCode === 400 && error.message?.includes('already exists')) {
      alert('A tag with this name already exists')
    } else {
      alert('Failed to create tag')
    }
  } finally {
    isCreatingTag.value = false
  }
}

onMounted(() => {
  fetchTags()
})
</script>
