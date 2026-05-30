<script setup lang="ts">
/**
 * Email + password login
 */
definePageMeta({ layout: 'blank' })

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

async function login() {
  if (!email.value || !password.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })

    // Send connected users to the collection, others into onboarding.
    if (response.user?.discogsConnected) {
      await navigateTo('/collection')
    } else {
      await navigateTo('/onboarding/connect-discogs')
    }
  } catch (error: any) {
    errorMessage.value = error.data?.message || 'Invalid email or password'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-grain" style="background: var(--bg-primary);">
    <!-- Brand panel -->
    <div class="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden" style="border-right: 1px solid var(--border-subtle);">
      <div class="absolute -top-24 -left-24 w-[30rem] h-[30rem] rounded-full blur-[120px] pointer-events-none" style="background: rgba(255,77,61,0.14);"></div>
      <div class="relative flex items-center gap-2">
        <span class="w-3 h-3 rounded-full" style="background: var(--accent);"></span>
        <span class="font-display font-bold text-xl">GrooveRepo</span>
      </div>
      <div class="relative max-w-md">
        <p class="eyebrow mb-5">For record collectors</p>
        <h1 class="display text-6xl leading-[0.95] mb-6">Your vinyl,<br>beautifully<br><span style="color: var(--accent);">organized.</span></h1>
        <p class="text-lg" style="color: var(--text-secondary);">Import your Discogs collection, build shelves, track conditions and explore your stats — all in one place.</p>
      </div>
      <div class="relative text-sm" style="color: var(--text-tertiary);">Your collection, your way.</div>
    </div>

    <!-- Form panel -->
    <div class="flex items-center justify-center p-6">
      <div class="max-w-sm w-full">
        <!-- Mobile wordmark -->
        <div class="lg:hidden flex items-center justify-center gap-2 mb-10">
          <span class="w-3 h-3 rounded-full" style="background: var(--accent);"></span>
          <span class="font-display font-bold text-xl">GrooveRepo</span>
        </div>

        <p class="eyebrow mb-3">Welcome back</p>
        <h2 class="display text-3xl mb-2">Sign in</h2>
        <p class="mb-8" style="color: var(--text-secondary);">Enter your email and password to continue.</p>

        <form @submit.prevent="login" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Email address</label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="input w-full px-4 py-3.5"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              class="input w-full px-4 py-3.5"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            :disabled="isLoading || !email || !password"
            class="btn-primary w-full"
          >
            <span v-if="isLoading">Signing in…</span>
            <span v-else>Sign in</span>
          </button>
        </form>

        <p v-if="errorMessage" class="mt-4 text-sm" style="color: var(--accent);">
          {{ errorMessage }}
        </p>
      </div>
    </div>
  </div>
</template>
