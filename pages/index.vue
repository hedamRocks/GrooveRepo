<script setup lang="ts">
/**
 * Landing page - redirects based on auth state
 */

const { data: session, error } = await useFetch('/api/auth/me')

if (error.value) {
  // Not authenticated
  navigateTo('/auth/login')
} else if (session.value?.user) {
  const user = session.value.user

  // Check if Discogs connected
  if (!user.discogsConnected) {
    navigateTo('/onboarding/connect-discogs')
  }
  // Check if import in progress
  else if (user.lastImportStatus === 'in_progress' || user.lastImportStatus === 'pending') {
    navigateTo('/onboarding/import-progress')
  }
  // Go to collection
  else {
    navigateTo('/collection')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
</template>
