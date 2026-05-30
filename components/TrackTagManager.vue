<template>
  <div>
    <!-- Current Tags -->
    <div v-if="trackTags.length > 0" class="flex flex-wrap gap-1.5 mb-2">
      <span
        v-for="trackTag in trackTags"
        :key="trackTag.id"
        class="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-medium rounded-full group"
        style="border: 1px solid var(--border-subtle); background: var(--bg-tertiary); color: var(--text-primary);"
      >
        <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: trackTag.tag.color || '#ff4d3d' }"></span>
        {{ trackTag.tag.name }}
        <button @click.stop="removeTag(trackTag.id)" class="transition-colors" style="color: var(--text-tertiary);" title="Remove tag">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
    </div>

    <!-- Add Tag Button -->
    <button @click="showTagSelector = true" class="text-xs font-medium transition-colors" style="color: var(--accent);">
      + Add tag
    </button>

    <!-- Tag Modal -->
    <Teleport to="body">
      <div v-if="showTagSelector" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click="closeModal">
        <div class="surface max-w-md w-full p-6 scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <!-- Header -->
          <div class="flex items-center justify-between mb-5">
            <h3 class="display text-xl">Manage tags</h3>
            <button @click="closeModal" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06]" style="color: var(--text-secondary);">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Create New Tag Form -->
          <div class="mb-5 pb-5" style="border-bottom: 1px solid var(--border-subtle);">
            <p class="eyebrow mb-3">Create new tag</p>
            <div class="flex gap-2">
              <input
                v-model="newTagName"
                type="text"
                placeholder="Tag name"
                class="input flex-1 px-3 py-2 text-sm"
                @keydown.enter="createAndAddTag"
              />
              <input v-model="newTagColor" type="color" class="w-11 h-10 rounded-lg cursor-pointer bg-transparent" style="border: 1px solid var(--border-subtle);" title="Tag color" />
              <button @click="createAndAddTag" :disabled="!newTagName.trim() || isCreatingTag" class="btn-primary !py-2 !px-4 text-sm">
                {{ isCreatingTag ? '…' : 'Add' }}
              </button>
            </div>
          </div>

          <!-- Existing Tags -->
          <div>
            <p class="eyebrow mb-3">Or select existing</p>

            <div v-if="isLoadingTags" class="text-center py-8">
              <div class="w-8 h-8 border-2 rounded-full animate-spin mx-auto" style="border-color: var(--accent); border-top-color: transparent;"></div>
            </div>

            <div v-else-if="availableTags.length === 0" class="text-sm py-8 text-center" style="color: var(--text-tertiary);">
              No existing tags available.
            </div>

            <div v-else class="space-y-1.5 max-h-64 overflow-y-auto mb-4">
              <button
                v-for="tag in availableTags"
                :key="tag.id"
                @click="toggleTagSelection(tag.id)"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left"
                :class="selectedTagIds.includes(tag.id) ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]' : 'hover:bg-white/[0.04]'"
              >
                <span class="w-4 h-4 rounded-md flex-shrink-0" :style="{ backgroundColor: tag.color || '#ff4d3d' }"></span>
                <span class="text-sm flex-1" style="color: var(--text-primary);">{{ tag.name }}</span>
                <svg v-if="selectedTagIds.includes(tag.id)" class="w-5 h-5" style="color: var(--accent);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>

            <!-- Add Selected Button -->
            <button v-if="selectedTagIds.length > 0" @click="addSelectedTags" :disabled="isAddingTags" class="btn-primary w-full">
              {{ isAddingTags ? 'Adding…' : `Add ${selectedTagIds.length} selected ${selectedTagIds.length === 1 ? 'tag' : 'tags'}` }}
            </button>
          </div>

          <!-- Done Button -->
          <div class="mt-5 pt-5" style="border-top: 1px solid var(--border-subtle);">
            <button @click="closeModal" class="btn-secondary w-full">Done</button>
          </div>
        </div>
      </div>
    </Teleport>
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
