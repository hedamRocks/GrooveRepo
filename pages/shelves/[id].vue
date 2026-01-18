<script setup lang="ts">
/**
 * Single shelf view - shows all records on this shelf
 */

const route = useRoute()
const router = useRouter()
const shelfId = route.params.id as string

const shelf = ref<any>(null)
const isLoading = ref(true)
const isDeleting = ref(false)

async function fetchShelf() {
  isLoading.value = true
  try {
    const response = await $fetch(`/api/shelves/${shelfId}`)
    shelf.value = response.shelf
  } catch (error) {
    console.error('Failed to fetch shelf:', error)
    router.push('/shelves')
  } finally {
    isLoading.value = false
  }
}

async function deleteShelf() {
  if (!confirm('Are you sure you want to delete this shelf? Records will not be deleted.')) {
    return
  }

  isDeleting.value = true
  try {
    await $fetch(`/api/shelves/${shelfId}`, {
      method: 'DELETE'
    })
    router.push('/shelves')
  } catch (error) {
    alert('Failed to delete shelf')
    isDeleting.value = false
  }
}

async function removeRecord(recordId: string) {
  try {
    await $fetch(`/api/shelves/${shelfId}/records/${recordId}`, {
      method: 'DELETE'
    })
    await fetchShelf() // Refresh
  } catch (error) {
    alert('Failed to remove record')
  }
}

onMounted(() => {
  fetchShelf()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>

    <!-- Shelf Content -->
    <div v-else-if="shelf" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="router.push('/shelves')"
          class="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to shelves
        </button>

        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-4 h-4 rounded-full flex-shrink-0"
              :style="{ backgroundColor: shelf.color || '#a78bfa' }"
            ></div>
            <div>
              <h1 class="text-3xl font-bold text-gray-900">{{ shelf.name }}</h1>
              <p v-if="shelf.description" class="text-gray-600 mt-1">{{ shelf.description }}</p>
              <p class="text-gray-500 text-sm mt-1">
                {{ shelf.placements.length }} {{ shelf.placements.length === 1 ? 'record' : 'records' }}
              </p>
            </div>
          </div>

          <button
            @click="deleteShelf"
            :disabled="isDeleting"
            class="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete Shelf' }}
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="shelf.placements.length === 0" class="text-center py-16">
        <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">This shelf is empty</h3>
        <p class="text-gray-600 mb-6">Add records to this shelf from the record detail page</p>
        <NuxtLink
          to="/collection"
          class="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
        >
          Browse collection
        </NuxtLink>
      </div>

      <!-- Records Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <div
          v-for="placement in shelf.placements"
          :key="placement.id"
          class="group relative"
        >
          <NuxtLink
            :to="`/collection/${placement.userRecord.id}`"
            class="block"
          >
            <div class="aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
              <img
                v-if="placement.userRecord.release.coverUrl || placement.userRecord.release.thumbUrl"
                :src="placement.userRecord.release.coverUrl || placement.userRecord.release.thumbUrl"
                :alt="placement.userRecord.release.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
                <svg class="w-16 h-16 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
              </div>
            </div>
            <div class="mt-2">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ placement.userRecord.release.artist || 'Unknown Artist' }}
              </p>
              <p class="text-xs text-gray-600 truncate">{{ placement.userRecord.release.title }}</p>
            </div>
          </NuxtLink>

          <!-- Remove Button (appears on hover) -->
          <button
            @click="removeRecord(placement.userRecord.id)"
            class="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-700"
            title="Remove from shelf"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
