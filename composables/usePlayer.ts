/**
 * Global dual-deck YouTube audio player state.
 *
 * Shared via useState so the bottom player (mounted once in the default layout)
 * survives route changes and can be driven from anywhere (e.g. the setlist
 * page's per-track "play on deck A/B" buttons). The actual YT.Player instances
 * live in components/GlobalPlayer.vue, which reacts to this state.
 */

export interface DeckTrack {
  trackId: string
  videoId: string
  title: string
  artist: string
  thumbUrl: string | null
  bpm: number | null
  // Whether the player should start playing on load (true only for the very
  // first track loaded into an empty player; later loads cue and wait).
  autoplay: boolean
}

export interface PlayableTrack {
  id: string
  title: string
  artist: string
  thumbUrl?: string | null
  bpm?: number | null
}

export type DeckId = 'A' | 'B'

export function usePlayer() {
  const deckA = useState<DeckTrack | null>('player-deck-a', () => null)
  const deckB = useState<DeckTrack | null>('player-deck-b', () => null)
  const visible = useState<boolean>('player-visible', () => false)
  const expanded = useState<boolean>('player-expanded', () => true)
  // Crossfader: 0 = full deck A, 100 = full deck B
  const crossfade = useState<number>('player-crossfade', () => 0)
  const playingA = useState<boolean>('player-playing-a', () => false)
  const playingB = useState<boolean>('player-playing-b', () => false)
  // Which deck is currently resolving a video (for button spinners)
  const loadingDeck = useState<DeckId | null>('player-loading-deck', () => null)

  function deckRef(deck: DeckId) {
    return deck === 'A' ? deckA : deckB
  }

  /**
   * Resolve the track to a YouTube video and load it onto the given deck.
   * Slides the player up and snaps the crossfader to that deck so you
   * immediately hear what you just loaded.
   */
  async function playOnDeck(deck: DeckId, track: PlayableTrack) {
    loadingDeck.value = deck
    try {
      const res = await $fetch<{ videoId: string; title: string }>(
        '/api/youtube/resolve',
        { method: 'POST', body: { trackId: track.id } }
      )

      // Autoplay only when the player is currently empty. If a track is already
      // loaded, just cue this one and leave the crossfader where it is.
      const wasEmpty = !deckA.value && !deckB.value

      deckRef(deck).value = {
        trackId: track.id,
        videoId: res.videoId,
        title: track.title,
        artist: track.artist,
        thumbUrl: track.thumbUrl ?? null,
        bpm: track.bpm ?? null,
        autoplay: wasEmpty
      }

      if (wasEmpty) crossfade.value = deck === 'A' ? 0 : 100
      visible.value = true
      expanded.value = true
    } catch (e: any) {
      console.error('[Player] Failed to load track:', e)
      alert(e?.data?.message || 'Could not find a YouTube source for this track')
    } finally {
      loadingDeck.value = null
    }
  }

  function clearDeck(deck: DeckId) {
    deckRef(deck).value = null
    if (deck === 'A') playingA.value = false
    else playingB.value = false
    // Auto-close once both decks are empty
    if (!deckA.value && !deckB.value) visible.value = false
  }

  function closePlayer() {
    visible.value = false
    deckA.value = null
    deckB.value = null
    playingA.value = false
    playingB.value = false
  }

  function toggleExpanded() {
    expanded.value = !expanded.value
  }

  return {
    deckA,
    deckB,
    visible,
    expanded,
    crossfade,
    playingA,
    playingB,
    loadingDeck,
    playOnDeck,
    clearDeck,
    closePlayer,
    toggleExpanded
  }
}
