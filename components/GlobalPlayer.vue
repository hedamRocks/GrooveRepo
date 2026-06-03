<template>
  <!-- Always mounted; slides off-screen when not visible so the YT players
       persist (audio keeps playing across collapse + route changes). -->
  <div
    class="fixed bottom-0 left-0 right-0 z-[55] transition-transform duration-500 ease-out"
    :style="{ transform: visible ? 'translateY(0)' : 'translateY(120%)' }"
    aria-live="polite"
  >
    <div class="w-full" style="background: var(--bg-secondary); border-top: 1px solid var(--border-subtle); box-shadow: var(--shadow-lg);">

      <!-- Video area (clipped to 0 height when collapsed; iframes stay mounted) -->
      <div class="overflow-hidden transition-all duration-300" :class="expanded ? 'pt-3' : 'h-0'">
        <!-- Slider viewport: both decks side-by-side on desktop; one at a time
             (slide left/right) on mobile, driven by mobileDeck. -->
        <div class="overflow-hidden max-w-5xl mx-auto px-3">
          <div
            class="flex w-[200%] sm:w-full transition-transform duration-300 ease-out sm:!translate-x-0"
            :class="mobileDeck === 'B' ? '-translate-x-1/2' : 'translate-x-0'"
          >
            <!-- Deck A panel -->
            <div class="w-1/2 flex-shrink-0 flex gap-2 items-stretch sm:pr-1.5">
              <div class="rounded-lg overflow-hidden bg-black h-36 sm:h-auto sm:aspect-video flex-1 min-w-0">
                <div id="yt-deck-a" class="w-full h-full"></div>
              </div>
              <div v-if="deckA" class="flex flex-col items-center gap-1 flex-shrink-0 py-1">
                <span class="text-[9px] uppercase tracking-wider" style="color: var(--text-tertiary);">Tempo</span>
                <input type="range" min="0.25" max="2" step="0.05" :value="rateA" @input="setRate('A', Number(($event.target as HTMLInputElement).value))" class="xfader-v flex-1 min-h-0" aria-label="Deck A tempo" />
                <span class="text-[11px] font-mono" style="color: var(--text-secondary);">{{ rateA.toFixed(2) }}×</span>
                <span v-if="deckA.bpm" class="text-[11px] font-mono" style="color: var(--accent);">{{ Math.round(deckA.bpm * rateA) }}</span>
                <button @click="syncDeck('A')" class="chip !py-0.5 !px-2 !text-[10px]" title="Match deck B's BPM">SYNC</button>
              </div>
            </div>
            <!-- Deck B panel (mirrors on desktop only) -->
            <div class="w-1/2 flex-shrink-0 flex gap-2 items-stretch sm:flex-row-reverse sm:pl-1.5">
              <div class="rounded-lg overflow-hidden bg-black h-36 sm:h-auto sm:aspect-video flex-1 min-w-0">
                <div id="yt-deck-b" class="w-full h-full"></div>
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

        <!-- Mobile deck selector (slides the deck into view) -->
        <div class="sm:hidden order-2 flex gap-1 p-1 rounded-full w-full" style="background: var(--bg-tertiary);">
          <button @click="mobileDeck = 'A'" class="flex-1 py-1.5 rounded-full text-xs font-medium transition-colors" :style="mobileDeck === 'A' ? 'background: var(--accent); color:#fff;' : 'color: var(--text-secondary);'">
            Deck A<span v-if="deckA" class="opacity-70"> · {{ playingA ? '▸' : '⏸' }}</span>
          </button>
          <button @click="mobileDeck = 'B'" class="flex-1 py-1.5 rounded-full text-xs font-medium transition-colors" :style="mobileDeck === 'B' ? 'background: var(--accent); color:#fff;' : 'color: var(--text-secondary);'">
            Deck B<span v-if="deckB" class="opacity-70"> · {{ playingB ? '▸' : '⏸' }}</span>
          </button>
        </div>

        <!-- Deck A -->
        <div :class="mobileDeck === 'A' ? 'flex' : 'hidden'" class="items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1 order-3 sm:order-1 sm:!flex">
          <span class="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :style="deckA ? 'background: var(--accent); color:#fff;' : 'background: var(--bg-tertiary); color: var(--text-tertiary);'">A</span>
          <button
            v-if="deckA"
            @click="togglePlay('A')"
            class="icon-btn p-1.5 flex-shrink-0"
            :title="playingA ? 'Pause deck A' : 'Play deck A'"
            :aria-label="playingA ? 'Pause deck A' : 'Play deck A'"
          >
            <svg v-if="playingA" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button
            v-if="deckA"
            @mousedown.prevent="startCue('A')"
            @mouseup="stopCue('A')"
            @mouseleave="stopCue('A')"
            @touchstart.prevent="startCue('A')"
            @touchend.prevent="stopCue('A')"
            class="icon-btn p-1.5 flex-shrink-0"
            title="Cue — hold to preview from the cue point"
            aria-label="Cue deck A (hold to preview)"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></svg>
          </button>
          <button v-if="deckA" @click="setCue('A')" class="chip !py-0.5 !px-1.5 font-mono !text-[10px] flex-shrink-0" title="Set cue point to current position">
            ⚑ {{ formatTime(cueA) }}
          </button>
          <div class="min-w-0">
            <p class="text-xs font-medium truncate" style="color: var(--text-primary);">{{ deckA?.title || 'Empty deck' }}</p>
            <p class="text-[11px] truncate" style="color: var(--text-secondary);">{{ deckA?.artist || '—' }}</p>
          </div>
          <button v-if="deckA" @click="clearDeck('A')" class="icon-danger p-1 flex-shrink-0" title="Remove from deck A" aria-label="Remove track from deck A">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Crossfader (always visible) -->
        <div class="flex flex-col items-center gap-1 flex-shrink-0 w-full sm:w-44 order-4 sm:order-2">
          <input
            type="range"
            min="0"
            max="100"
            v-model.number="crossfade"
            class="xfader w-full"
            aria-label="Crossfader between deck A and deck B"
          />
          <div class="flex justify-between w-full text-[9px] uppercase tracking-wider" style="color: var(--text-tertiary);">
            <span>A</span>
            <span>fade</span>
            <span>B</span>
          </div>
        </div>

        <!-- Deck B (same DOM order as A; mirrors only on desktop) -->
        <div :class="mobileDeck === 'B' ? 'flex' : 'hidden'" class="items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1 order-3 sm:order-3 sm:!flex sm:flex-row-reverse sm:justify-end">
          <span class="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :style="deckB ? 'background: var(--accent); color:#fff;' : 'background: var(--bg-tertiary); color: var(--text-tertiary);'">B</span>
          <button
            v-if="deckB"
            @click="togglePlay('B')"
            class="icon-btn p-1.5 flex-shrink-0"
            :title="playingB ? 'Pause deck B' : 'Play deck B'"
            :aria-label="playingB ? 'Pause deck B' : 'Play deck B'"
          >
            <svg v-if="playingB" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button
            v-if="deckB"
            @mousedown.prevent="startCue('B')"
            @mouseup="stopCue('B')"
            @mouseleave="stopCue('B')"
            @touchstart.prevent="startCue('B')"
            @touchend.prevent="stopCue('B')"
            class="icon-btn p-1.5 flex-shrink-0"
            title="Cue — hold to preview from the cue point"
            aria-label="Cue deck B (hold to preview)"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></svg>
          </button>
          <button v-if="deckB" @click="setCue('B')" class="chip !py-0.5 !px-1.5 font-mono !text-[10px] flex-shrink-0" title="Set cue point to current position">
            ⚑ {{ formatTime(cueB) }}
          </button>
          <div class="min-w-0 sm:text-right">
            <p class="text-xs font-medium truncate" style="color: var(--text-primary);">{{ deckB?.title || 'Empty deck' }}</p>
            <p class="text-[11px] truncate" style="color: var(--text-secondary);">{{ deckB?.artist || '—' }}</p>
          </div>
          <button v-if="deckB" @click="clearDeck('B')" class="icon-danger p-1 flex-shrink-0" title="Remove from deck B" aria-label="Remove track from deck B">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Window controls (top-right on mobile, end of row on desktop) -->
        <div class="flex items-center gap-0.5 flex-shrink-0 self-end sm:self-auto order-1 sm:order-4 sm:pl-1 sm:border-l sm:border-white/10">
          <button @click="toggleExpanded" class="icon-btn p-1.5" :title="expanded ? 'Collapse' : 'Expand'" :aria-label="expanded ? 'Collapse player' : 'Expand player'">
            <svg v-if="expanded" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7" /></svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 11l7-7 7 7" /></svg>
          </button>
          <button @click="closePlayer" class="icon-danger p-1.5" title="Close player" aria-label="Close player">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DeckId } from '~/composables/usePlayer'

const {
  deckA,
  deckB,
  visible,
  expanded,
  crossfade,
  playingA,
  playingB,
  clearDeck,
  closePlayer,
  toggleExpanded
} = usePlayer()

// Which deck is shown on mobile (desktop shows both)
const mobileDeck = ref<DeckId>('A')

let playerA: any = null
let playerB: any = null
const readyA = ref(false)
const readyB = ref(false)
// Video queued before its player finished initializing
let pendingA: { videoId: string; autoplay: boolean } | null = null
let pendingB: { videoId: string; autoplay: boolean } | null = null

function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as any
    if (w.YT && w.YT.Player) return resolve()

    // Chain any existing ready handler so we don't clobber it
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev()
      resolve()
    }

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'yt-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  })
}

const PLAYER_VARS = {
  controls: 1,
  modestbranding: 1,
  rel: 0,
  playsinline: 1,
  fs: 0,
  iv_load_policy: 3 // hide annotations
}

function buildPlayer(elId: string, deck: DeckId) {
  const w = window as any
  return new w.YT.Player(elId, {
    width: '100%',
    height: '100%',
    playerVars: PLAYER_VARS,
    events: {
      onReady: () => {
        if (deck === 'A') {
          readyA.value = true
          if (pendingA) { loadInto('A', pendingA.videoId, pendingA.autoplay); pendingA = null }
        } else {
          readyB.value = true
          if (pendingB) { loadInto('B', pendingB.videoId, pendingB.autoplay); pendingB = null }
        }
        applyVolumes()
      },
      onPlaybackRateChange: (e: any) => {
        // Reflect the rate YouTube actually applied (self-corrects if it snaps)
        if (deck === 'A') rateA.value = e.data
        else rateB.value = e.data
      },
      onStateChange: (e: any) => {
        const YT = (window as any).YT
        const isPlaying = e.data === YT.PlayerState.PLAYING
        const isPausedOrEnded = e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED
        if (deck === 'A') {
          if (isPlaying) playingA.value = true
          else if (isPausedOrEnded) playingA.value = false
        } else {
          if (isPlaying) playingB.value = true
          else if (isPausedOrEnded) playingB.value = false
        }
      }
    }
  })
}

// Equal-power crossfade so the combined loudness stays roughly constant
function applyVolumes() {
  const t = (Number(crossfade.value) || 0) / 100
  const volA = Math.round(Math.cos((t * Math.PI) / 2) * 100)
  const volB = Math.round(Math.sin((t * Math.PI) / 2) * 100)
  try {
    if (playerA && readyA.value) playerA.setVolume(volA)
    if (playerB && readyB.value) playerB.setVolume(volB)
  } catch (e) {
    /* player not ready yet */
  }
}

function loadInto(deck: DeckId, videoId: string | undefined, autoplay: boolean) {
  if (!videoId) return
  // loadVideoById autoplays; cueVideoById loads paused and waits for the user
  const method = autoplay ? 'loadVideoById' : 'cueVideoById'
  if (deck === 'A') {
    if (playerA && readyA.value) playerA[method](videoId)
    else pendingA = { videoId, autoplay }
  } else {
    if (playerB && readyB.value) playerB[method](videoId)
    else pendingB = { videoId, autoplay }
  }
  nextTick(applyVolumes)
}

// Stop and reset a deck's player (used when a deck is removed / player closed)
function stopDeck(deck: DeckId) {
  const player = deck === 'A' ? playerA : playerB
  try { if (player) player.stopVideo() } catch (e) { /* not ready */ }
  if (deck === 'A') { playingA.value = false; pendingA = null; cueA.value = 0; rateA.value = 1 }
  else { playingB.value = false; pendingB = null; cueB.value = 0; rateB.value = 1 }
}

// --- Cue points (momentary preview, DJ-style) ---
const cueA = ref(0)
const cueB = ref(0)
let cuingA = false
let cuingB = false

function getPlayer(deck: DeckId) {
  return deck === 'A' ? playerA : playerB
}

// Press-and-hold: jump to the cue point and play
function startCue(deck: DeckId) {
  const player = getPlayer(deck)
  if (!player) return
  const cue = deck === 'A' ? cueA.value : cueB.value
  try {
    player.seekTo(cue, true)
    player.playVideo()
    if (deck === 'A') cuingA = true
    else cuingB = true
  } catch (e) { /* not ready */ }
}

// Release: pause and snap back to the cue point
function stopCue(deck: DeckId) {
  const cuing = deck === 'A' ? cuingA : cuingB
  if (!cuing) return
  const player = getPlayer(deck)
  const cue = deck === 'A' ? cueA.value : cueB.value
  try {
    player.pauseVideo()
    player.seekTo(cue, true)
  } catch (e) { /* ignore */ }
  if (deck === 'A') cuingA = false
  else cuingB = false
}

// Set the cue point to the current playback position
function setCue(deck: DeckId) {
  const player = getPlayer(deck)
  if (!player) return
  try {
    const t = player.getCurrentTime() || 0
    if (deck === 'A') cueA.value = t
    else cueB.value = t
  } catch (e) { /* ignore */ }
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// --- Tempo / sync ---
// We send fine-grained rates via setPlaybackRate; the onPlaybackRateChange
// event reports the rate YouTube actually applied, keeping the UI honest.
const RATE_MIN = 0.25
const RATE_MAX = 2
const rateA = ref(1)
const rateB = ref(1)

function clampRate(rate: number) {
  return Math.min(RATE_MAX, Math.max(RATE_MIN, rate))
}

function setRate(deck: DeckId, rate: number) {
  const r = clampRate(rate)
  const player = getPlayer(deck)
  try { if (player) player.setPlaybackRate(r) } catch (e) { /* not ready */ }
  // Optimistic; onPlaybackRateChange will confirm/correct the displayed value
  if (deck === 'A') rateA.value = r
  else rateB.value = r
}

// Match this deck's BPM to the other deck's: rate = otherBpm / thisBpm
function syncDeck(deck: DeckId) {
  const thisBpm = deck === 'A' ? deckA.value?.bpm : deckB.value?.bpm
  const otherBpm = deck === 'A' ? deckB.value?.bpm : deckA.value?.bpm
  if (!thisBpm || !otherBpm) {
    alert('Both decks need an analyzed BPM to sync')
    return
  }
  setRate(deck, otherBpm / thisBpm)
}

function togglePlay(deck: DeckId) {
  const player = deck === 'A' ? playerA : playerB
  const playing = deck === 'A' ? playingA.value : playingB.value
  if (!player) return
  try {
    if (playing) player.pauseVideo()
    else player.playVideo()
  } catch (e) {
    /* ignore */
  }
}

onMounted(async () => {
  await loadYouTubeApi()
  playerA = buildPlayer('yt-deck-a', 'A')
  playerB = buildPlayer('yt-deck-b', 'B')

  // If a deck was already populated before the players initialized, load it
  if (deckA.value?.videoId) loadInto('A', deckA.value.videoId, deckA.value.autoplay)
  if (deckB.value?.videoId) loadInto('B', deckB.value.videoId, deckB.value.autoplay)
})

// React to a deck being loaded (new track) or cleared (set to null)
watch(() => deckA.value?.trackId, (id) => { if (id) { cueA.value = 0; setRate('A', 1); mobileDeck.value = 'A' } })
watch(() => deckB.value?.trackId, (id) => { if (id) { cueB.value = 0; setRate('B', 1); mobileDeck.value = 'B' } })
watch(() => deckA.value, (d) => {
  if (d?.videoId) loadInto('A', d.videoId, d.autoplay)
  else stopDeck('A')
})
watch(() => deckB.value, (d) => {
  if (d?.videoId) loadInto('B', d.videoId, d.autoplay)
  else stopDeck('B')
})
watch(crossfade, applyVolumes)
</script>

<style scoped>
/* Crossfader slider styled to the design system */
.xfader {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(to right, var(--accent), var(--bg-tertiary), var(--accent));
  outline: none;
  cursor: pointer;
}
.xfader::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--accent);
  box-shadow: var(--shadow-sm);
}
.xfader::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--accent);
}

/* Vertical tempo fader: bottom = slow, top = fast */
.xfader-v {
  -webkit-appearance: none;
  appearance: none;
  writing-mode: vertical-lr;
  direction: rtl;
  width: 6px;
  border-radius: 999px;
  background: linear-gradient(to top, var(--bg-tertiary), var(--accent));
  outline: none;
  cursor: pointer;
}
.xfader-v::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--accent);
  box-shadow: var(--shadow-sm);
}
.xfader-v::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--accent);
}
</style>
