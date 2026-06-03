<template>
  <!-- Always mounted; slides off-screen when hidden so the audio graph persists -->
  <div
    class="fixed bottom-0 left-0 right-0 z-[55] transition-transform duration-500 ease-out"
    :style="{ transform: visible ? 'translateY(0)' : 'translateY(120%)' }"
    aria-live="polite"
  >
    <div class="w-full" style="background: var(--bg-secondary); border-top: 1px solid var(--border-subtle); box-shadow: var(--shadow-lg);">

      <!-- Stage (artwork + seek + tempo). Clipped to 0 height when collapsed. -->
      <div class="overflow-hidden transition-all duration-300" :class="expanded ? 'pt-3' : 'h-0'">
        <div class="overflow-hidden max-w-5xl mx-auto px-3">
          <div
            class="flex w-[200%] sm:w-full transition-transform duration-300 ease-out sm:!translate-x-0"
            :class="mobileDeck === 'B' ? '-translate-x-1/2' : 'translate-x-0'"
          >
            <!-- Deck A stage -->
            <div class="w-1/2 flex-shrink-0 flex gap-2 items-stretch sm:pr-1.5">
              <div class="flex-1 min-w-0 flex flex-col gap-1.5">
                <div class="rounded-lg overflow-hidden bg-black relative h-32 sm:h-40">
                  <img v-if="deckA?.thumbUrl" :src="deckA.thumbUrl" :alt="deckA?.title" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center" style="background: var(--bg-tertiary);">
                    <svg class="w-10 h-10" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                  </div>
                  <div v-if="loadingA" class="absolute inset-0 flex items-center justify-center bg-black/55">
                    <div class="w-7 h-7 border-2 rounded-full animate-spin" style="border-color: var(--accent); border-top-color: transparent;"></div>
                  </div>
                  <div v-else-if="errorA" class="absolute inset-0 flex items-center justify-center bg-black/75 p-3 text-center text-xs" style="color: #ff6b6b;">{{ errorA }}</div>
                </div>
                <input type="range" min="0" :max="durA || 0" step="0.1" :value="posA" @input="onSeekInput('A', Number(($event.target as HTMLInputElement).value))" @change="onSeekCommit('A', Number(($event.target as HTMLInputElement).value))" class="xfader w-full" style="touch-action: none;" :disabled="!deckA || loadingA" aria-label="Seek deck A" />
                <div class="flex justify-between text-[10px] font-mono" style="color: var(--text-tertiary);"><span>{{ fmtTime(posA) }}</span><span>{{ fmtTime(durA) }}</span></div>
              </div>
              <div v-if="deckA" class="flex flex-col items-center gap-1 flex-shrink-0 py-1">
                <span class="text-[9px] uppercase tracking-wider" style="color: var(--text-tertiary);">Tempo</span>
                <input type="range" min="0.25" max="2" step="0.05" :value="rateA" @input="setRate('A', Number(($event.target as HTMLInputElement).value))" class="xfader-v flex-1 min-h-0" aria-label="Deck A tempo" />
                <span class="text-[11px] font-mono" style="color: var(--text-secondary);">{{ rateA.toFixed(2) }}×</span>
                <span v-if="deckA.bpm" class="text-[11px] font-mono" style="color: var(--accent);">{{ Math.round(deckA.bpm * rateA) }}</span>
                <button @click="syncDeck('A')" class="chip !py-0.5 !px-2 !text-[10px]" title="Match deck B's BPM">SYNC</button>
              </div>
            </div>
            <!-- Deck B stage (mirrors on desktop only) -->
            <div class="w-1/2 flex-shrink-0 flex gap-2 items-stretch sm:flex-row-reverse sm:pl-1.5">
              <div class="flex-1 min-w-0 flex flex-col gap-1.5">
                <div class="rounded-lg overflow-hidden bg-black relative h-32 sm:h-40">
                  <img v-if="deckB?.thumbUrl" :src="deckB.thumbUrl" :alt="deckB?.title" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center" style="background: var(--bg-tertiary);">
                    <svg class="w-10 h-10" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                  </div>
                  <div v-if="loadingB" class="absolute inset-0 flex items-center justify-center bg-black/55">
                    <div class="w-7 h-7 border-2 rounded-full animate-spin" style="border-color: var(--accent); border-top-color: transparent;"></div>
                  </div>
                  <div v-else-if="errorB" class="absolute inset-0 flex items-center justify-center bg-black/75 p-3 text-center text-xs" style="color: #ff6b6b;">{{ errorB }}</div>
                </div>
                <input type="range" min="0" :max="durB || 0" step="0.1" :value="posB" @input="onSeekInput('B', Number(($event.target as HTMLInputElement).value))" @change="onSeekCommit('B', Number(($event.target as HTMLInputElement).value))" class="xfader w-full" style="touch-action: none;" :disabled="!deckB || loadingB" aria-label="Seek deck B" />
                <div class="flex justify-between text-[10px] font-mono" style="color: var(--text-tertiary);"><span>{{ fmtTime(posB) }}</span><span>{{ fmtTime(durB) }}</span></div>
              </div>
              <div v-if="deckB" class="flex flex-col items-center gap-1 flex-shrink-0 py-1">
                <span class="text-[9px] uppercase tracking-wider" style="color: var(--text-tertiary);">Tempo</span>
                <input type="range" min="0.25" max="2" step="0.05" :value="rateB" @input="setRate('B', Number(($event.target as HTMLInputElement).value))" class="xfader-v flex-1 min-h-0" aria-label="Deck B tempo" />
                <span class="text-[11px] font-mono" style="color: var(--text-secondary);">{{ rateB.toFixed(2) }}×</span>
                <span v-if="deckB.bpm" class="text-[11px] font-mono" style="color: var(--accent);">{{ Math.round(deckB.bpm * rateB) }}</span>
                <button @click="syncDeck('B')" class="chip !py-0.5 !px-2 !text-[10px]" title="Match deck A's BPM">SYNC</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Control bar -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 max-w-5xl mx-auto">

        <!-- Mobile deck selector -->
        <div class="sm:hidden order-2 flex gap-1 p-1 rounded-full w-full" style="background: var(--bg-tertiary);">
          <button @click="mobileDeck = 'A'" class="flex-1 py-1.5 rounded-full text-xs font-medium transition-colors" :style="mobileDeck === 'A' ? 'background: var(--accent); color:#fff;' : 'color: var(--text-secondary);'">
            Deck A<span v-if="deckA" class="opacity-70"> · {{ playingA ? '▸' : '⏸' }}</span>
          </button>
          <button @click="mobileDeck = 'B'" class="flex-1 py-1.5 rounded-full text-xs font-medium transition-colors" :style="mobileDeck === 'B' ? 'background: var(--accent); color:#fff;' : 'color: var(--text-secondary);'">
            Deck B<span v-if="deckB" class="opacity-70"> · {{ playingB ? '▸' : '⏸' }}</span>
          </button>
        </div>

        <!-- Deck A controls -->
        <div :class="mobileDeck === 'A' ? 'flex' : 'hidden'" class="items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1 order-3 sm:order-1 sm:!flex">
          <span class="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :style="deckA ? 'background: var(--accent); color:#fff;' : 'background: var(--bg-tertiary); color: var(--text-tertiary);'">A</span>
          <button v-if="deckA" @click="togglePlay('A')" class="icon-btn p-2.5 flex-shrink-0" :title="playingA ? 'Pause deck A' : 'Play deck A'" :aria-label="playingA ? 'Pause deck A' : 'Play deck A'">
            <svg v-if="playingA" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button
            v-if="deckA"
            @mousedown.prevent="startCue('A')" @mouseup="stopCue('A')" @mouseleave="stopCue('A')"
            @touchstart.prevent="startCue('A')" @touchend.prevent="stopCue('A')"
            class="icon-btn p-2.5 flex-shrink-0" title="Cue — hold to preview from the cue point" aria-label="Cue deck A (hold to preview)"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></svg>
          </button>
          <button v-if="deckA" @click="setCue('A')" class="chip !py-1 !px-2.5 font-mono !text-xs flex-shrink-0" title="Set cue point to current position">
            ⚑ {{ fmtTime(cueA) }}
          </button>
          <div class="hidden sm:block min-w-0">
            <p class="text-xs font-medium truncate" style="color: var(--text-primary);">{{ deckA?.title || 'Empty deck' }}</p>
            <p class="text-[11px] truncate" style="color: var(--text-secondary);">{{ deckA?.artist || '—' }}</p>
          </div>
          <button v-if="deckA" @click="clearDeck('A')" class="icon-danger p-2 flex-shrink-0" title="Remove from deck A" aria-label="Remove track from deck A">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Crossfader (always visible; kept off the screen edges) -->
        <div class="flex flex-col items-center gap-1.5 flex-shrink-0 w-3/5 self-center sm:self-auto sm:w-48 order-4 sm:order-2">
          <input type="range" min="0" max="100" v-model.number="crossfade" class="xfader w-full" style="touch-action: none;" aria-label="Crossfader between deck A and deck B" />
          <div class="flex justify-between w-full text-[9px] uppercase tracking-wider" style="color: var(--text-tertiary);">
            <span>A</span><span>fade</span><span>B</span>
          </div>
        </div>

        <!-- Deck B controls (same DOM order as A; mirrors only on desktop) -->
        <div :class="mobileDeck === 'B' ? 'flex' : 'hidden'" class="items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1 order-3 sm:order-3 sm:!flex sm:flex-row-reverse sm:justify-end">
          <span class="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :style="deckB ? 'background: var(--accent); color:#fff;' : 'background: var(--bg-tertiary); color: var(--text-tertiary);'">B</span>
          <button v-if="deckB" @click="togglePlay('B')" class="icon-btn p-2.5 flex-shrink-0" :title="playingB ? 'Pause deck B' : 'Play deck B'" :aria-label="playingB ? 'Pause deck B' : 'Play deck B'">
            <svg v-if="playingB" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button
            v-if="deckB"
            @mousedown.prevent="startCue('B')" @mouseup="stopCue('B')" @mouseleave="stopCue('B')"
            @touchstart.prevent="startCue('B')" @touchend.prevent="stopCue('B')"
            class="icon-btn p-2.5 flex-shrink-0" title="Cue — hold to preview from the cue point" aria-label="Cue deck B (hold to preview)"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></svg>
          </button>
          <button v-if="deckB" @click="setCue('B')" class="chip !py-1 !px-2.5 font-mono !text-xs flex-shrink-0" title="Set cue point to current position">
            ⚑ {{ fmtTime(cueB) }}
          </button>
          <div class="hidden sm:block min-w-0 sm:text-right">
            <p class="text-xs font-medium truncate" style="color: var(--text-primary);">{{ deckB?.title || 'Empty deck' }}</p>
            <p class="text-[11px] truncate" style="color: var(--text-secondary);">{{ deckB?.artist || '—' }}</p>
          </div>
          <button v-if="deckB" @click="clearDeck('B')" class="icon-danger p-2 flex-shrink-0" title="Remove from deck B" aria-label="Remove track from deck B">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Window controls -->
        <div class="flex items-center gap-0.5 flex-shrink-0 self-end sm:self-auto order-1 sm:order-4 sm:pl-1 sm:border-l sm:border-white/10">
          <button @click="toggleExpanded" class="icon-btn p-2" :title="expanded ? 'Collapse' : 'Expand'" :aria-label="expanded ? 'Collapse player' : 'Expand player'">
            <svg v-if="expanded" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7" /></svg>
            <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 11l7-7 7 7" /></svg>
          </button>
          <button @click="onClose" class="icon-danger p-2" title="Close player" aria-label="Close player">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DeckId, DeckTrack } from '~/composables/usePlayer'

const {
  deckA, deckB, visible, expanded, crossfade,
  playingA, playingB, loadingDeck, clearDeck, closePlayer, toggleExpanded
} = usePlayer()

const mobileDeck = ref<DeckId>('A')

// Reactive UI state (per deck)
const rateA = ref(1); const rateB = ref(1)
const cueA = ref(0); const cueB = ref(0)
const posA = ref(0); const posB = ref(0)
const durA = ref(0); const durB = ref(0)
const loadingA = ref(false); const loadingB = ref(false)
const errorA = ref<string | null>(null); const errorB = ref<string | null>(null)
const seekingA = ref(false); const seekingB = ref(false)
function seekingRef(d: DeckId) { return d === 'A' ? seekingA : seekingB }

function rateRef(d: DeckId) { return d === 'A' ? rateA : rateB }
function cueRef(d: DeckId) { return d === 'A' ? cueA : cueB }
function posRef(d: DeckId) { return d === 'A' ? posA : posB }
function durRef(d: DeckId) { return d === 'A' ? durA : durB }
function loadingRef(d: DeckId) { return d === 'A' ? loadingA : loadingB }
function errorRef(d: DeckId) { return d === 'A' ? errorA : errorB }
function setPlaying(d: DeckId, v: boolean) { (d === 'A' ? playingA : playingB).value = v }

// --- Web Audio graph ---
interface DeckNode {
  buffer: AudioBuffer | null
  source: AudioBufferSourceNode | null
  gain: GainNode | null
  startCtxTime: number  // ctx time when the current play segment began
  startOffset: number   // buffer position (s) at segment start / when paused
  rate: number
  cueing: boolean
  suppressEnded: boolean
  token: number         // guards against stale async loads
}
function freshDeck(): DeckNode {
  return { buffer: null, source: null, gain: null, startCtxTime: 0, startOffset: 0, rate: 1, cueing: false, suppressEnded: false, token: 0 }
}
const nodes: Record<DeckId, DeckNode> = { A: freshDeck(), B: freshDeck() }

let ctx: AudioContext | null = null

function ensureCtx(): AudioContext {
  if (!ctx) {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
    ctx = new Ctor()
    nodes.A.gain = ctx.createGain()
    nodes.B.gain = ctx.createGain()
    nodes.A.gain.connect(ctx.destination)
    nodes.B.gain.connect(ctx.destination)
    applyVolumes()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// Equal-power crossfade; a deck with no buffer stays silent
function applyVolumes() {
  const t = (Number(crossfade.value) || 0) / 100
  if (nodes.A.gain) nodes.A.gain.gain.value = deckA.value ? Math.cos((t * Math.PI) / 2) : 0
  if (nodes.B.gain) nodes.B.gain.gain.value = deckB.value ? Math.sin((t * Math.PI) / 2) : 0
}

function currentPos(d: DeckId): number {
  const n = nodes[d]
  if (!n.buffer) return 0
  if (!n.source || !ctx) return n.startOffset
  const playing = (d === 'A' ? playingA : playingB).value
  if (!playing) return n.startOffset
  return Math.min(n.startOffset + (ctx.currentTime - n.startCtxTime) * n.rate, n.buffer.duration)
}

function stopSource(d: DeckId) {
  const n = nodes[d]
  if (n.source) {
    n.suppressEnded = true
    try { n.source.stop() } catch (e) {}
    try { n.source.disconnect() } catch (e) {}
    n.source = null
  }
}

function startPlayback(d: DeckId, offset: number) {
  const n = nodes[d]
  if (!n.buffer) return
  const audio = ensureCtx()
  stopSource(d)
  const src = audio.createBufferSource()
  src.buffer = n.buffer
  src.playbackRate.value = n.rate
  src.connect(n.gain!)
  n.suppressEnded = false
  src.onended = () => {
    if (n.suppressEnded) return
    setPlaying(d, false)
    n.startOffset = 0
    posRef(d).value = 0
  }
  const safe = Math.max(0, Math.min(offset, n.buffer.duration - 0.05))
  src.start(0, safe)
  n.source = src
  n.startCtxTime = audio.currentTime
  n.startOffset = safe
  setPlaying(d, true)
  startRaf()
}

function pausePlayback(d: DeckId) {
  if (!(d === 'A' ? playingA : playingB).value) return
  const pos = currentPos(d)
  stopSource(d)
  nodes[d].startOffset = pos
  setPlaying(d, false)
  posRef(d).value = pos
}

function togglePlay(d: DeckId) {
  ensureCtx()
  if (!nodes[d].buffer) return
  if ((d === 'A' ? playingA : playingB).value) pausePlayback(d)
  else startPlayback(d, nodes[d].startOffset)
}

// While dragging the seek bar: follow the finger, suppress the progress loop
function onSeekInput(d: DeckId, t: number) {
  seekingRef(d).value = true
  posRef(d).value = t
}
// On release: actually jump to the chosen position
function onSeekCommit(d: DeckId, t: number) {
  seekingRef(d).value = false
  const n = nodes[d]
  if (!n.buffer) return
  if ((d === 'A' ? playingA : playingB).value) startPlayback(d, t)
  else { n.startOffset = t; posRef(d).value = t }
}

// --- Cue (hold to preview from the cue point) ---
function startCue(d: DeckId) {
  ensureCtx()
  if (!nodes[d].buffer) return
  nodes[d].cueing = true
  startPlayback(d, cueRef(d).value)
}
function stopCue(d: DeckId) {
  if (!nodes[d].cueing) return
  nodes[d].cueing = false
  stopSource(d)
  nodes[d].startOffset = cueRef(d).value
  setPlaying(d, false)
  posRef(d).value = cueRef(d).value
}
function setCue(d: DeckId) {
  cueRef(d).value = currentPos(d)
}

// --- Tempo / sync ---
const RATE_MIN = 0.25
const RATE_MAX = 2
function clampRate(r: number) { return Math.min(RATE_MAX, Math.max(RATE_MIN, r)) }
function setRate(d: DeckId, rate: number) {
  const r = clampRate(rate)
  const n = nodes[d]
  if ((d === 'A' ? playingA : playingB).value && ctx) {
    // rebase position so the live progress math stays correct
    n.startOffset = currentPos(d)
    n.startCtxTime = ctx.currentTime
  }
  n.rate = r
  if (n.source) n.source.playbackRate.value = r
  rateRef(d).value = r
}
function syncDeck(d: DeckId) {
  const thisBpm = (d === 'A' ? deckA : deckB).value?.bpm
  const otherBpm = (d === 'A' ? deckB : deckA).value?.bpm
  if (!thisBpm || !otherBpm) { alert('Both decks need an analyzed BPM to sync'); return }
  setRate(d, otherBpm / thisBpm)
}

// --- Loading / teardown ---
async function loadDeck(d: DeckId, track: DeckTrack) {
  const n = nodes[d]
  const myToken = ++n.token
  mobileDeck.value = d
  loadingRef(d).value = true
  errorRef(d).value = null
  loadingDeck.value = d

  // reset deck
  stopSource(d); setPlaying(d, false)
  n.buffer = null; n.startOffset = 0; n.cueing = false
  cueRef(d).value = 0; posRef(d).value = 0; durRef(d).value = 0
  setRate(d, 1)

  try {
    const audio = ensureCtx()
    const res = await fetch(`/api/audio/${track.trackId}`)
    if (!res.ok) {
      const msg = await res.json().then((b) => b?.message).catch(() => null)
      throw new Error(msg || `Audio unavailable (${res.status})`)
    }
    const arr = await res.arrayBuffer()
    if (myToken !== n.token) return // superseded by a newer load
    const buffer = await audio.decodeAudioData(arr)
    if (myToken !== n.token) return
    n.buffer = buffer
    durRef(d).value = buffer.duration
    applyVolumes()
    if (track.autoplay) startPlayback(d, 0)
  } catch (e: any) {
    if (myToken === n.token) errorRef(d).value = e?.message || 'Could not load audio'
    console.error('[Audio] load failed:', e)
  } finally {
    if (myToken === n.token) {
      loadingRef(d).value = false
      if (loadingDeck.value === d) loadingDeck.value = null
    }
  }
}

function teardown(d: DeckId) {
  nodes[d].token++
  stopSource(d)
  nodes[d].buffer = null
  nodes[d].startOffset = 0
  nodes[d].cueing = false
  setPlaying(d, false)
  loadingRef(d).value = false
  errorRef(d).value = null
  posRef(d).value = 0
  durRef(d).value = 0
  cueRef(d).value = 0
  rateRef(d).value = 1
  applyVolumes()
}

function onClose() {
  teardown('A')
  teardown('B')
  closePlayer()
}

// --- Progress loop ---
let raf = 0
function startRaf() {
  if (raf) return
  const tick = () => {
    let any = false
    ;(['A', 'B'] as DeckId[]).forEach((d) => {
      if ((d === 'A' ? playingA : playingB).value) {
        any = true
        if (!seekingRef(d).value) posRef(d).value = currentPos(d)
      }
    })
    raf = any ? requestAnimationFrame(tick) : 0
  }
  raf = requestAnimationFrame(tick)
}

function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// Unlock/resume the AudioContext on the first user gesture (iOS requirement)
function unlock() { ensureCtx() }

onMounted(() => {
  window.addEventListener('pointerdown', unlock)
  if (deckA.value) loadDeck('A', deckA.value)
  if (deckB.value) loadDeck('B', deckB.value)
})
onBeforeUnmount(() => window.removeEventListener('pointerdown', unlock))

watch(() => deckA.value, (d) => { if (d) loadDeck('A', d); else teardown('A') })
watch(() => deckB.value, (d) => { if (d) loadDeck('B', d); else teardown('B') })
watch(crossfade, applyVolumes)
</script>

<style scoped>
.xfader {
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(to right, var(--accent), var(--bg-tertiary), var(--accent));
  outline: none;
  cursor: pointer;
}
.xfader::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--accent);
  box-shadow: var(--shadow-md);
}
.xfader::-moz-range-thumb {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--accent);
}
.xfader:disabled { opacity: 0.5; }

/* Vertical tempo fader: bottom = slow, top = fast */
.xfader-v {
  -webkit-appearance: none;
  appearance: none;
  writing-mode: vertical-lr;
  direction: rtl;
  width: 8px;
  border-radius: 999px;
  background: linear-gradient(to top, var(--bg-tertiary), var(--accent));
  outline: none;
  cursor: pointer;
  touch-action: none;
}
.xfader-v::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--accent);
  box-shadow: var(--shadow-md);
}
.xfader-v::-moz-range-thumb {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--accent);
}
</style>
