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
  <div class="min-h-screen flex items-center justify-center bg-dots relative" style="background-color: var(--bg-primary);">
    <!-- Ambient background elements -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl floating" style="animation-duration: 8s;"></div>
      <div class="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl floating" style="animation-duration: 6s; animation-delay: 2s;"></div>
      <div class="absolute top-1/2 left-1/2 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl floating" style="animation-duration: 4s; animation-delay: 1s;"></div>
    </div>

    <div class="relative text-center scale-in">
      <!-- Modern Loading Spinner -->
      <div class="relative mb-12">
        <div class="w-24 h-24 mx-auto relative">
          <!-- Outer ring -->
          <div class="absolute inset-0 border-2 border-transparent border-t-cyan-400 animate-spin" style="animation-duration: 1s;"></div>
          <!-- Middle ring -->
          <div class="absolute inset-2 border border-transparent border-r-purple-400 animate-spin" style="animation-duration: 1.5s; animation-direction: reverse;"></div>
          <!-- Inner ring -->
          <div class="absolute inset-4 border border-transparent border-b-pink-400 animate-spin" style="animation-duration: 2s;"></div>
          <!-- Center dot -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-3 h-3 bg-cyan-400 rounded-full pulsing neon-glow"></div>
          </div>
        </div>
        
        <!-- Floating Elements -->
        <div class="absolute -top-6 -left-8 w-2 h-2 bg-cyan-400 neon-glow floating opacity-80" style="animation-delay: 0s;"></div>
        <div class="absolute -top-4 right-6 w-1.5 h-1.5 bg-purple-400 neon-glow floating opacity-60" style="animation-delay: 1s;"></div>
        <div class="absolute -bottom-6 -right-8 w-2.5 h-2.5 bg-pink-400 neon-glow floating opacity-70" style="animation-delay: 2s;"></div>
        <div class="absolute -bottom-4 -left-6 w-1 h-1 bg-yellow-400 neon-glow floating opacity-50" style="animation-delay: 1.5s;"></div>
      </div>
      
      <!-- Loading Text -->
      <div class="space-y-6">
        <h1 class="text-4xl font-bold gradient-text">GrooveRepo</h1>
        <div class="space-y-2">
          <p class="font-mono text-sm uppercase tracking-widest" style="color: var(--text-secondary);">
            Initializing Collection
          </p>
          <!-- Progress bar -->
          <div class="w-48 h-1 bg-gray-800 mx-auto overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 animate-pulse" style="width: 60%;"></div>
          </div>
        </div>
        
        <!-- Progress dots -->
        <div class="flex justify-center space-x-2">
          <div class="w-2 h-2 bg-cyan-400 neon-glow animate-bounce" style="animation-delay: 0s;"></div>
          <div class="w-2 h-2 bg-purple-400 neon-glow animate-bounce" style="animation-delay: 0.2s;"></div>
          <div class="w-2 h-2 bg-pink-400 neon-glow animate-bounce" style="animation-delay: 0.4s;"></div>
        </div>
      </div>
    </div>
  </div>
</template>
