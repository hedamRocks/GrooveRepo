<template>
  <!-- Always mounted; slides off-screen when hidden so the audio graph persists -->
  <div
    class="fixed bottom-0 left-0 right-0 z-[55] transition-transform duration-500 ease-out"
    :style="{ transform: visible ? 'translateY(0)' : 'translateY(120%)' }"
    aria-live="polite"
  >
    <div ref="barEl" class="w-full" style="background: var(--bg-secondary); border-top: 1px solid var(--border-subtle); box-shadow: var(--shadow-lg);">

      <!-- Top strip: now-playing + collapse, spans the whole player -->
      <div class="flex items-center justify-between gap-3 max-w-5xl mx-auto px-4 pt-2.5 pb-1">
        <div class="flex items-center gap-4 min-w-0 text-[11px]">
          <span v-if="deckA" class="flex items-center gap-1.5 min-w-0 max-w-[48%]">
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ background: playingA ? 'var(--accent)' : 'var(--text-tertiary)' }"></span>
            <span class="truncate" style="color: var(--text-secondary);">{{ deckA.title }}</span>
          </span>
          <span v-if="deckB" class="flex items-center gap-1.5 min-w-0 max-w-[48%]">
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ background: playingB ? 'var(--accent)' : 'var(--text-tertiary)' }"></span>
            <span class="truncate" style="color: var(--text-secondary);">{{ deckB.title }}</span>
          </span>
          <span v-if="!deckA && !deckB" class="text-[10px] uppercase tracking-wider" style="color: var(--text-tertiary);">Player</span>
        </div>
        <button @click="toggleExpanded" class="icon-btn p-2 flex-shrink-0" :title="expanded ? 'Collapse' : 'Expand'" :aria-label="expanded ? 'Collapse player' : 'Expand player'">
          <svg v-if="expanded" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7" /></svg>
          <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 11l7-7 7 7" /></svg>
        </button>
      </div>

      <!-- Stage (collapses together with the controls below) -->
      <div v-show="expanded" class="overflow-hidden">
        <div class="overflow-hidden max-w-5xl mx-auto px-3 sm:px-4 pt-1">
          <div
            class="flex w-[200%] sm:w-full transition-transform duration-300 ease-out sm:!translate-x-0"
            :class="mobileDeck === 'B' ? '-translate-x-1/2' : 'translate-x-0'"
          >
            <!-- Deck A stage -->
            <div class="w-1/2 flex-shrink-0 px-1.5 sm:px-2.5">
              <div class="surface-2 rounded-xl p-3 sm:p-4 flex flex-col gap-3 relative">
                <button v-if="deckA" @click="clearDeck('A')" class="absolute top-2 right-2 z-10 icon-danger p-1.5 rounded-lg" title="Remove from deck A" aria-label="Remove track from deck A">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div class="flex items-center gap-4">
                  <!-- Tempo fader (outer edge) -->
                  <div v-if="deckA" class="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <span class="text-[9px] uppercase tracking-wider" style="color: var(--text-tertiary);">Tempo</span>
                    <input type="range" min="0.25" max="2" step="0.05" :value="rateA" @input="setRate('A', Number(($event.target as HTMLInputElement).value))" class="xfader-v h-24 sm:h-28" aria-label="Deck A tempo" />
                    <span class="text-[11px] font-mono" style="color: var(--text-secondary);">{{ rateA.toFixed(2) }}×</span>
                    <span v-if="deckA.bpm" class="text-[11px] font-mono" style="color: var(--accent);">{{ Math.round(deckA.bpm * rateA) }}</span>
                    <button @click="syncDeck('A')" class="dj-btn !min-h-[28px] !min-w-0 !text-[10px] w-full" title="Match deck B's BPM">SYNC</button>
                  </div>
                  <!-- Jog-wheel platter -->
                  <div class="flex-1 flex justify-center">
                    <div class="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-black" style="box-shadow: 0 0 0 1px var(--border-strong), inset 0 0 24px rgba(0,0,0,0.7);">
                      <img v-if="deckA?.thumbUrl" :src="deckA.thumbUrl" :alt="deckA?.title" class="w-full h-full object-cover" :class="playingA ? 'platter-spin' : ''" />
                      <div v-else class="w-full h-full flex items-center justify-center" style="background: var(--bg-tertiary);">
                        <svg class="w-8 h-8" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                      </div>
                      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ring-2 ring-black/60" style="background: var(--bg-secondary);"></div>
                      <div v-if="loadingA" class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60">
                        <div class="w-6 h-6 border-2 rounded-full animate-spin" style="border-color: var(--accent); border-top-color: transparent;"></div>
                        <span v-if="preparingA" class="text-[9px] uppercase tracking-wider" style="color: var(--text-secondary);">Preparing…</span>
                      </div>
                      <div v-else-if="errorA" class="absolute inset-0 flex items-center justify-center bg-black/80 p-2 text-center text-[10px]" style="color: #ff6b6b;">{{ errorA }}</div>
                    </div>
                  </div>
                </div>
                <input type="range" min="0" :max="durA || 0" step="0.1" :value="posA" @input="onSeekInput('A', Number(($event.target as HTMLInputElement).value))" @change="onSeekCommit('A', Number(($event.target as HTMLInputElement).value))" class="xfader w-full" style="touch-action: none;" :disabled="!deckA || loadingA" aria-label="Seek deck A" />
                <div class="flex justify-between text-[10px] font-mono" style="color: var(--text-tertiary);"><span>{{ fmtTime(posA) }}</span><span>{{ fmtTime(durA) }}</span></div>
              </div>
            </div>
            <!-- Deck B stage (tempo on the outer edge; mirrors on desktop) -->
            <div class="w-1/2 flex-shrink-0 px-1.5 sm:px-2.5">
              <div class="surface-2 rounded-xl p-3 sm:p-4 flex flex-col gap-3 relative">
                <button v-if="deckB" @click="clearDeck('B')" class="absolute top-2 right-2 z-10 icon-danger p-1.5 rounded-lg" title="Remove from deck B" aria-label="Remove track from deck B">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div class="flex items-center gap-4 sm:flex-row-reverse">
                  <div v-if="deckB" class="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <span class="text-[9px] uppercase tracking-wider" style="color: var(--text-tertiary);">Tempo</span>
                    <input type="range" min="0.25" max="2" step="0.05" :value="rateB" @input="setRate('B', Number(($event.target as HTMLInputElement).value))" class="xfader-v h-24 sm:h-28" aria-label="Deck B tempo" />
                    <span class="text-[11px] font-mono" style="color: var(--text-secondary);">{{ rateB.toFixed(2) }}×</span>
                    <span v-if="deckB.bpm" class="text-[11px] font-mono" style="color: var(--accent);">{{ Math.round(deckB.bpm * rateB) }}</span>
                    <button @click="syncDeck('B')" class="dj-btn !min-h-[28px] !min-w-0 !text-[10px] w-full" title="Match deck A's BPM">SYNC</button>
                  </div>
                  <div class="flex-1 flex justify-center">
                    <div class="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-black" style="box-shadow: 0 0 0 1px var(--border-strong), inset 0 0 24px rgba(0,0,0,0.7);">
                      <img v-if="deckB?.thumbUrl" :src="deckB.thumbUrl" :alt="deckB?.title" class="w-full h-full object-cover" :class="playingB ? 'platter-spin' : ''" />
                      <div v-else class="w-full h-full flex items-center justify-center" style="background: var(--bg-tertiary);">
                        <svg class="w-8 h-8" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                      </div>
                      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ring-2 ring-black/60" style="background: var(--bg-secondary);"></div>
                      <div v-if="loadingB" class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60">
                        <div class="w-6 h-6 border-2 rounded-full animate-spin" style="border-color: var(--accent); border-top-color: transparent;"></div>
                        <span v-if="preparingB" class="text-[9px] uppercase tracking-wider" style="color: var(--text-secondary);">Preparing…</span>
                      </div>
                      <div v-else-if="errorB" class="absolute inset-0 flex items-center justify-center bg-black/80 p-2 text-center text-[10px]" style="color: #ff6b6b;">{{ errorB }}</div>
                    </div>
                  </div>
                </div>
                <input type="range" min="0" :max="durB || 0" step="0.1" :value="posB" @input="onSeekInput('B', Number(($event.target as HTMLInputElement).value))" @change="onSeekCommit('B', Number(($event.target as HTMLInputElement).value))" class="xfader w-full" style="touch-action: none;" :disabled="!deckB || loadingB" aria-label="Seek deck B" />
                <div class="flex justify-between text-[10px] font-mono" style="color: var(--text-tertiary);"><span>{{ fmtTime(posB) }}</span><span>{{ fmtTime(durB) }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Control bar (collapses with the stage) -->
      <div v-show="expanded" class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-4 pt-2 max-w-5xl mx-auto" style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);">

        <!-- Mobile deck selector -->
        <div class="sm:hidden order-1 flex gap-1 p-1 rounded-full w-full" style="background: var(--bg-tertiary);">
          <button @click="mobileDeck = 'A'" class="flex-1 py-1.5 rounded-full text-xs font-medium transition-colors" :style="mobileDeck === 'A' ? 'background: var(--accent); color:#fff;' : 'color: var(--text-secondary);'">
            Deck A<span v-if="deckA" class="opacity-70"> · {{ playingA ? '▸' : '⏸' }}</span>
          </button>
          <button @click="mobileDeck = 'B'" class="flex-1 py-1.5 rounded-full text-xs font-medium transition-colors" :style="mobileDeck === 'B' ? 'background: var(--accent); color:#fff;' : 'color: var(--text-secondary);'">
            Deck B<span v-if="deckB" class="opacity-70"> · {{ playingB ? '▸' : '⏸' }}</span>
          </button>
        </div>

        <!-- Deck A transport -->
        <div :class="mobileDeck === 'A' ? 'flex' : 'hidden'" class="items-center justify-center sm:justify-end gap-2.5 w-full sm:w-auto sm:flex-1 order-2 sm:order-1 sm:!flex">
          <button v-if="deckA" @click="togglePlay('A')" class="dj-btn flex-shrink-0" :class="playingA ? 'dj-btn-lit' : ''" :title="playingA ? 'Pause deck A' : 'Play deck A'" :aria-label="playingA ? 'Pause deck A' : 'Play deck A'">
            <svg v-if="playingA" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button
            v-if="deckA"
            @mousedown.prevent="startCue('A')" @mouseup="stopCue('A')" @mouseleave="stopCue('A')"
            @touchstart.prevent="startCue('A')" @touchend.prevent="stopCue('A')"
            class="dj-btn flex-shrink-0" title="Cue — hold to preview from the cue point" aria-label="Cue deck A (hold to preview)"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></svg>
          </button>
          <button v-if="deckA" @click="setCue('A')" class="chip !py-1 !px-2.5 font-mono !text-xs flex-shrink-0" title="Set cue point to current position">
            ⚑ {{ fmtTime(cueA) }}
          </button>
        </div>

        <!-- Crossfader -->
        <div class="flex flex-col items-center gap-3 flex-shrink-0 w-3/5 self-center sm:self-auto sm:w-56 order-3 sm:order-2 py-1">
          <input type="range" min="0" max="100" v-model.number="crossfade" class="xfader w-full" style="touch-action: none;" aria-label="Crossfader between deck A and deck B" />
          <div class="flex justify-between w-full text-[9px] uppercase tracking-wider" style="color: var(--text-tertiary);">
            <span>A</span><span>fade</span><span>B</span>
          </div>
        </div>

        <!-- Deck B transport -->
        <div :class="mobileDeck === 'B' ? 'flex' : 'hidden'" class="items-center justify-center sm:justify-start gap-2.5 w-full sm:w-auto sm:flex-1 order-2 sm:order-3 sm:!flex">
          <button v-if="deckB" @click="togglePlay('B')" class="dj-btn flex-shrink-0" :class="playingB ? 'dj-btn-lit' : ''" :title="playingB ? 'Pause deck B' : 'Play deck B'" :aria-label="playingB ? 'Pause deck B' : 'Play deck B'">
            <svg v-if="playingB" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button
            v-if="deckB"
            @mousedown.prevent="startCue('B')" @mouseup="stopCue('B')" @mouseleave="stopCue('B')"
            @touchstart.prevent="startCue('B')" @touchend.prevent="stopCue('B')"
            class="dj-btn flex-shrink-0" title="Cue — hold to preview from the cue point" aria-label="Cue deck B (hold to preview)"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></svg>
          </button>
          <button v-if="deckB" @click="setCue('B')" class="chip !py-1 !px-2.5 font-mono !text-xs flex-shrink-0" title="Set cue point to current position">
            ⚑ {{ fmtTime(cueB) }}
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
const preparingA = ref(false); const preparingB = ref(false)
function preparingRef(d: DeckId) { return d === 'A' ? preparingA : preparingB }

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
let iosUnlocked = false

// Tell iOS this is media playback so the Web Audio output ignores the physical
// ring/silent switch (otherwise the AudioContext is muted when the phone is on
// silent). Supported on iOS 16.4+; a no-op elsewhere.
function setPlaybackSession() {
  try {
    const session = (navigator as any).audioSession
    if (session) session.type = 'playback'
  } catch (e) { /* ignore */ }
}

function ensureCtx(): AudioContext {
  if (!ctx) {
    setPlaybackSession()
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

// iOS keeps the context suspended until a sound is started inside a real user
// gesture — resume() alone isn't enough, so also play a 1-sample silent buffer.
function unlockAudio() {
  setPlaybackSession()
  const audio = ensureCtx()
  if (audio.state === 'suspended') audio.resume().catch(() => {})
  if (iosUnlocked) return
  try {
    const buf = audio.createBuffer(1, 1, 22050)
    const src = audio.createBufferSource()
    src.buffer = buf
    src.connect(audio.destination)
    src.start(0)
    iosUnlocked = true
  } catch (e) { /* ignore */ }
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
  unlockAudio()
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
  unlockAudio()
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

    // The endpoint returns 202 while the worker is still fetching the audio
    // (R2 mode). Poll until it's ready (or a redirect to the cached file).
    let res: Response | null = null
    for (let attempt = 0; attempt < 40; attempt++) {
      if (myToken !== n.token) return
      res = await fetch(`/api/audio/${track.trackId}`)
      if (res.status === 202) {
        preparingRef(d).value = true
        await new Promise((r) => setTimeout(r, 3000))
        continue
      }
      break
    }
    preparingRef(d).value = false
    if (!res || !res.ok) {
      const msg = res ? await res.json().then((b) => b?.message).catch(() => null) : null
      throw new Error(msg || 'Audio unavailable — is the worker running?')
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
      preparingRef(d).value = false
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
  preparingRef(d).value = false
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
// Update ~5×/s (not every animation frame) — a phone chokes on 60fps reactive
// re-renders of the seek bar + time, and a progress readout doesn't need them.
let progressTimer: ReturnType<typeof setInterval> | null = null
function startRaf() {
  if (progressTimer) return
  progressTimer = setInterval(() => {
    let any = false
    ;(['A', 'B'] as DeckId[]).forEach((d) => {
      if ((d === 'A' ? playingA : playingB).value) {
        any = true
        if (!seekingRef(d).value) posRef(d).value = currentPos(d)
      }
    })
    if (!any && progressTimer) { clearInterval(progressTimer); progressTimer = null }
  }, 200)
}

function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// Publish the player's height as a CSS var so pages can pad their content and
// keep their own fixed bars (e.g. the setlist "Add track" bar) above the player.
const barEl = ref<HTMLElement | null>(null)
let ro: ResizeObserver | null = null
function publishHeight() {
  const h = visible.value && barEl.value ? barEl.value.offsetHeight : 0
  document.documentElement.style.setProperty('--player-height', `${h}px`)
}

onMounted(() => {
  window.addEventListener('pointerdown', unlockAudio)
  window.addEventListener('touchend', unlockAudio)
  window.addEventListener('click', unlockAudio)
  if (barEl.value) {
    ro = new ResizeObserver(publishHeight)
    ro.observe(barEl.value)
  }
  publishHeight()
  if (deckA.value) loadDeck('A', deckA.value)
  if (deckB.value) loadDeck('B', deckB.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', unlockAudio)
  window.removeEventListener('touchend', unlockAudio)
  window.removeEventListener('click', unlockAudio)
  ro?.disconnect()
  if (progressTimer) clearInterval(progressTimer)
  document.documentElement.style.setProperty('--player-height', '0px')
})

watch([visible, expanded], () => nextTick(publishHeight))

watch(() => deckA.value, (d) => { if (d) loadDeck('A', d); else teardown('A') })
watch(() => deckB.value, (d) => { if (d) loadDeck('B', d); else teardown('B') })
watch(crossfade, applyVolumes)
</script>

<style scoped>
/* Chunky, backlit DJ-controller buttons */
.dj-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-width: 42px;
  min-height: 38px;
  padding: 0 0.6rem;
  border-radius: 9px;
  background: linear-gradient(180deg, var(--bg-elevated), var(--bg-tertiary));
  border: 1px solid var(--border-strong);
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.05em;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 2px 4px rgba(0, 0, 0, 0.4);
  transition: all 0.12s ease;
  cursor: pointer;
}
.dj-btn:hover { color: var(--text-primary); border-color: var(--accent); }
.dj-btn:active,
.dj-btn.dj-btn-lit {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  box-shadow: 0 0 16px var(--accent-glow), 0 0 0 1px var(--accent) inset;
}
.dj-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

/* Spinning jog-wheel platter while a deck plays */
@keyframes platterSpin { to { transform: rotate(360deg); } }
.platter-spin { animation: platterSpin 3.2s linear infinite; will-change: transform; transform: translateZ(0); }
@media (prefers-reduced-motion: reduce) { .platter-spin { animation: none; } }

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
