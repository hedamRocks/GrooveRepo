<template>
  <div class="surface p-6">
    <p class="eyebrow mb-4">BPM Tapper</p>

    <!-- BPM Display -->
    <div class="text-center mb-6">
      <div class="display text-6xl mb-2" style="color: var(--accent);">
        {{ displayBpm }}
      </div>
      <div class="text-sm" style="color: var(--text-tertiary);">
        {{ taps.length > 0 ? `${taps.length} taps` : 'Tap to start' }}
      </div>
    </div>

    <!-- Tap Button -->
    <button
      @click="tap"
      @keydown.space.prevent="tap"
      class="w-full py-8 text-white text-xl font-bold rounded-2xl transition-all mb-4 focus:outline-none active:scale-[0.99]"
      style="background: var(--accent); font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.1em;"
    >
      TAP
    </button>

    <!-- Manual Input -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Or enter manually</label>
      <input
        v-model.number="manualBpm"
        type="number"
        min="1"
        max="300"
        placeholder="Enter BPM"
        class="input w-full px-4 py-2.5"
        @input="onManualInput"
      />
    </div>

    <!-- Common BPM Presets -->
    <div class="mb-6">
      <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Quick presets</label>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="preset in presets"
          :key="preset"
          @click="setPreset(preset)"
          class="chip justify-center !py-2 font-mono"
          :class="manualBpm === preset ? 'chip-active' : ''"
        >
          {{ preset }}
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-3">
      <button @click="reset" class="btn-secondary flex-1">Reset</button>
      <button v-if="displayBpm !== '--'" @click="useBpm" class="btn-primary flex-1">Use {{ displayBpm }} BPM</button>
    </div>

    <!-- Help Text -->
    <div class="mt-4 text-xs text-center" style="color: var(--text-tertiary);">
      Press SPACE or click TAP in rhythm. The counter resets after 3 seconds of inactivity.
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
