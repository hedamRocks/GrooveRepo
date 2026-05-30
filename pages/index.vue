<script setup lang="ts">
/**
 * Landing page - redirects based on auth state
 */
definePageMeta({ layout: 'blank' })

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
  <div class="min-h-screen flex items-center justify-center bg-grain relative overflow-hidden" style="background-color: var(--bg-primary);">
    <!-- Ambient coral glow -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/3 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full blur-[120px]" style="background: rgba(255,77,61,0.10);"></div>
    </div>

    <div class="relative text-center scale-in">
      <!-- Loading mark -->
      <div class="relative mb-10 mx-auto w-16 h-16">
        <div class="absolute inset-0 rounded-full border-2 border-white/10"></div>
        <div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style="border-top-color: var(--accent); animation-duration: 0.9s;"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-2.5 h-2.5 rounded-full" style="background: var(--accent);"></div>
        </div>
      </div>

      <h1 class="display text-4xl mb-3">Groove<span style="color: var(--text-secondary);">Repo</span></h1>
      <p class="eyebrow">Loading your collection</p>

      <div class="w-44 h-1 mx-auto mt-6 rounded-full overflow-hidden" style="background: var(--bg-tertiary);">
        <div class="h-full rounded-full animate-pulse" style="width: 60%; background: var(--accent);"></div>
      </div>
    </div>
  </div>
</template>
