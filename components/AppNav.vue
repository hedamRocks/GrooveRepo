<script setup lang="ts">
const route = useRoute()
const mobileOpen = ref(false)

const links = [
  { label: 'Collection', to: '/collection' },
  { label: 'Shelves', to: '/shelves' },
  { label: 'Setlists', to: '/setlists' },
  { label: 'Tags', to: '/tags' },
  { label: 'Stats', to: '/stats' },
]

const isActive = (to: string) => {
  if (to === '/collection') return route.path.startsWith('/collection')
  return route.path.startsWith(to)
}

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch (e) {
    // ignore
  }
  await navigateTo('/auth/login')
}

watch(() => route.path, () => { mobileOpen.value = false })

// Tracklist backfill progress (shared) — visible from any page while running.
const { running: backfillRunning, percent: backfillPercent, loadStatus: loadBackfillStatus } = useTracklistBackfill()
onMounted(() => loadBackfillStatus())
</script>

<template>
  <header class="sticky top-0 z-50">
    <div class="backdrop-blur-xl" style="background: rgba(11,11,12,0.82); border-bottom: 1px solid var(--border-subtle);">
      <nav class="max-w-8xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <!-- Wordmark -->
        <NuxtLink to="/collection" class="flex items-center gap-2 shrink-0 group">
          <span class="w-2.5 h-2.5 rounded-full" style="background: var(--accent);"></span>
          <span class="font-display font-bold text-lg tracking-tight">Groove<span class="text-[var(--text-secondary)] group-hover:text-white transition-colors">Repo</span></span>
        </NuxtLink>

        <!-- Desktop links -->
        <div class="hidden md:flex items-center gap-1 ml-2">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="px-3.5 py-2 text-sm font-medium rounded-full transition-colors"
            :class="isActive(link.to)
              ? 'text-white bg-white/[0.07]'
              : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.04]'"
          >
            {{ link.label }}
          </NuxtLink>
        </div>

        <!-- Right cluster -->
        <div class="flex items-center gap-2 ml-auto">
          <!-- Tracklist backfill progress -->
          <NuxtLink
            v-if="backfillRunning"
            to="/collection"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style="background: var(--accent-soft); color: var(--accent); border: 1px solid var(--border-subtle);"
            title="Fetching tracklists — view progress"
            aria-label="Fetching tracklists, in progress"
          >
            <span class="w-3 h-3 rounded-full border-2 animate-spin" style="border-color: var(--accent); border-top-color: transparent;"></span>
            <span class="font-mono">{{ backfillPercent }}%</span>
            <span class="hidden md:inline">tracklists</span>
          </NuxtLink>

          <NuxtLink to="/collection/add" class="hidden sm:inline-flex btn-primary !py-2 !px-4 text-sm">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
            Add record
          </NuxtLink>
          <button
            type="button"
            class="hidden md:inline-flex btn-ghost text-sm"
            title="Log out"
            aria-label="Log out"
            @click="logout"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>

          <!-- Mobile toggle -->
          <button
            type="button"
            class="md:hidden w-10 h-10 inline-flex items-center justify-center rounded-full text-white hover:bg-white/[0.06]"
            aria-label="Menu"
            @click="mobileOpen = !mobileOpen"
          >
            <svg v-if="!mobileOpen" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18" stroke-linecap="round"/></svg>
            <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12" stroke-linecap="round"/></svg>
          </button>
        </div>
      </nav>
    </div>

    <!-- Mobile menu -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="mobileOpen"
        class="md:hidden backdrop-blur-xl px-4 pb-4 pt-1"
        style="background: rgba(11,11,12,0.96); border-bottom: 1px solid var(--border-subtle);"
      >
        <div class="flex flex-col gap-1">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="px-4 py-3 rounded-xl text-base font-medium transition-colors"
            :class="isActive(link.to) ? 'text-white bg-white/[0.07]' : 'text-[var(--text-secondary)] hover:text-white'"
          >
            {{ link.label }}
          </NuxtLink>
          <NuxtLink to="/collection/add" class="btn-primary mt-2 w-full">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
            Add record
          </NuxtLink>
          <button type="button" class="btn-secondary mt-1 w-full" @click="logout">Log out</button>
        </div>
      </div>
    </Transition>
  </header>
</template>
