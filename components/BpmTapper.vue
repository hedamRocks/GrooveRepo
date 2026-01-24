<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">BPM Tapper</h3>

    <!-- BPM Display -->
    <div class="text-center mb-6">
      <div class="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-2">
        {{ displayBpm }}
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ taps.length > 0 ? `${taps.length} taps` : 'Tap to start' }}
      </div>
    </div>

    <!-- Tap Button -->
    <button
      @click="tap"
      @keydown.space.prevent="tap"
      class="w-full py-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xl font-bold rounded-lg transition-colors mb-4 focus:outline-none focus:ring-4 focus:ring-blue-300"
    >
      TAP
    </button>

    <!-- Manual Input -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Or enter manually
      </label>
      <input
        v-model.number="manualBpm"
        type="number"
        min="1"
        max="300"
        placeholder="Enter BPM"
        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @input="onManualInput"
      />
    </div>

    <!-- Common BPM Presets -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Quick presets
      </label>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="preset in presets"
          :key="preset"
          @click="setPreset(preset)"
          class="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {{ preset }}
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex space-x-3">
      <button
        @click="reset"
        class="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        Reset
      </button>
      <button
        v-if="displayBpm !== '--'"
        @click="useBpm"
        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Use {{ displayBpm }} BPM
      </button>
    </div>

    <!-- Help Text -->
    <div class="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
      Press SPACE or click TAP button in rhythm. Tap counter resets after 3 seconds of inactivity.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  (e: 'bpmSelected', bpm: number): void
}>()

const taps = ref<number[]>([])
const currentBpm = ref<number | null>(null)
const manualBpm = ref<number | null>(null)
const resetTimeout = ref<NodeJS.Timeout | null>(null)

const presets = [90, 100, 110, 120, 125, 128, 130, 140]

const displayBpm = computed(() => {
  if (manualBpm.value) return manualBpm.value
  if (currentBpm.value) return currentBpm.value
  return '--'
})

function tap() {
  const now = Date.now()

  // Reset if last tap was more than 3 seconds ago
  if (taps.value.length > 0 && now - taps.value[taps.value.length - 1] > 3000) {
    taps.value = []
  }

  taps.value.push(now)

  // Need at least 2 taps to calculate BPM
  if (taps.value.length >= 2) {
    calculateBpm()
  }

  // Keep only last 8 taps for more accurate recent tempo
  if (taps.value.length > 8) {
    taps.value.shift()
  }

  // Clear manual input when tapping
  manualBpm.value = null

  // Set timeout to clear taps after 3 seconds of inactivity
  if (resetTimeout.value) {
    clearTimeout(resetTimeout.value)
  }
  resetTimeout.value = setTimeout(() => {
    taps.value = []
  }, 3000)
}

function calculateBpm() {
  if (taps.value.length < 2) return

  // Calculate intervals between taps
  const intervals: number[] = []
  for (let i = 1; i < taps.value.length; i++) {
    intervals.push(taps.value[i] - taps.value[i - 1])
  }

  // Average interval in milliseconds
  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length

  // Convert to BPM (60000 ms per minute)
  const bpm = Math.round(60000 / avgInterval)

  // Validate BPM is in reasonable range
  if (bpm >= 40 && bpm <= 300) {
    currentBpm.value = bpm
  }
}

function onManualInput() {
  // Clear taps when manually entering
  if (manualBpm.value) {
    taps.value = []
    currentBpm.value = null
  }
}

function setPreset(bpm: number) {
  manualBpm.value = bpm
  taps.value = []
  currentBpm.value = null
}

function reset() {
  taps.value = []
  currentBpm.value = null
  manualBpm.value = null
  if (resetTimeout.value) {
    clearTimeout(resetTimeout.value)
  }
}

function useBpm() {
  const bpm = manualBpm.value || currentBpm.value
  if (bpm) {
    emit('bpmSelected', bpm)
    reset()
  }
}

// Keyboard support
function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault()
    tap()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (resetTimeout.value) {
    clearTimeout(resetTimeout.value)
  }
})
</script>
