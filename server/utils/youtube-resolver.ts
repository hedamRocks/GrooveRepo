import { youtube_v3 } from '@googleapis/youtube'
import { compareTwoStrings } from 'string-similarity'

/**
 * YouTube Video Resolution Engine
 * Intelligently selects the best video match for a given track
 */

/**
 * Generic retry utility with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number
    initialDelayMs?: number
    maxDelayMs?: number
    operationName?: string
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    operationName = 'operation'
  } = options

  let lastError: Error | unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt === maxAttempts) {
        console.error(`[Retry] ${operationName} failed after ${maxAttempts} attempts:`, error)
        throw error
      }

      // Calculate exponential backoff delay
      const delayMs = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs
      )

      console.log(`[Retry] ${operationName} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}

export interface TrackMetadata {
  artist: string
  title: string
  album?: string
  duration?: number // seconds
}

export interface VideoCandidate {
  videoId: string
  title: string
  channelTitle: string
  duration: number // seconds
  score: number
}

export interface ResolvedVideo {
  videoId: string
  title: string
  score: number
  confidence: number
  duration: number  // Duration in seconds
}

const PENALTY_KEYWORDS = [
  'live',
  'cover',
  'remix',
  'edit',
  'sped up',
  'slowed',
  'slowed + reverb',
  'nightcore',
  'acoustic',
  'instrumental',
  'karaoke',
  'tutorial',
  'how to play',
  'lesson',
  'full album',
  'complete album',
  'álbum completo',
  'disco completo',
  'full lp',
  'entire album',
  'whole album',
  // Commercial/Ad keywords
  'commercial',
  'advertisement',
  'ad ',
  'promo',
  'promotional',
  'jingle',
  'spot',
  'tv spot',
  'radio spot'
]

// CRITICAL PENALTY - Automatic rejection
const CRITICAL_PENALTY_KEYWORDS = [
  'full album',
  'complete album',
  'álbum completo',
  'disco completo',
  'full lp',
  'entire album',
  'whole album',
  'all tracks'
]

const BOOST_CHANNELS = [
  '- Topic',  // YouTube auto-generated official artist channels
  'VEVO',
  'Official'
]

/**
 * Resolve a track to a YouTube video ID
 */
export async function resolveYouTubeVideo(
  track: TrackMetadata,
  apiKey: string
): Promise<ResolvedVideo | null> {
  const youtube = new youtube_v3.Youtube({
    auth: apiKey
  })

  // Build search query
  const query = buildSearchQuery(track)

  console.log(`[YouTube Resolver] Searching for: "${query}"`)

  try {
    // Search YouTube with retry logic and duration pre-filtering
    const searchResponse = await retryWithBackoff(
      async () => {
        return await youtube.search.list({
          part: ['snippet'],
          q: query,
          type: ['video'],
          maxResults: 10,
          videoCategoryId: '10', // Music category
          videoDuration: 'medium', // Pre-filter to 4-20 min videos (excludes very short and very long)
          safeSearch: 'none'
        })
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        operationName: 'YouTube search'
      }
    )

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      console.log('[YouTube Resolver] No results found')
      return null
    }

    // Fetch video details (for duration) with retry logic
    const videoIds = searchResponse.data.items
      .map(item => item.id?.videoId)
      .filter(Boolean) as string[]

    const videosResponse = await retryWithBackoff(
      async () => {
        return await youtube.videos.list({
          part: ['contentDetails', 'snippet'],
          id: videoIds
        })
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        operationName: 'YouTube video details'
      }
    )

    if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
      return null
    }

    // Score each candidate
    const candidates: VideoCandidate[] = videosResponse.data.items
      .map(item => {
        const videoId = item.id!
        const title = item.snippet?.title || ''
        const channelTitle = item.snippet?.channelTitle || ''
        const duration = parseDuration(item.contentDetails?.duration || '')

        const score = scoreCandidate(
          { title, channelTitle, duration },
          track
        )

        return {
          videoId,
          title,
          channelTitle,
          duration,
          score
        }
      })
      .filter(c => c.score > 0.3) // Filter out very low scores

    if (candidates.length === 0) {
      console.log('[YouTube Resolver] No candidates passed minimum score threshold')
      return null
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score)

    const winner = candidates[0]
    console.log(`[YouTube Resolver] Selected: "${winner.title}" (score: ${winner.score.toFixed(2)}, duration: ${winner.duration}s)`)

    return {
      videoId: winner.videoId,
      title: winner.title,
      score: winner.score,
      confidence: winner.score,
      duration: winner.duration
    }

  } catch (error) {
    console.error('[YouTube Resolver] Error:', error)
    return null
  }
}

/**
 * Build search query from track metadata
 * Simplified to just: "artist - track"
 */
function buildSearchQuery(track: TrackMetadata): string {
  const parts: string[] = []

  if (track.artist) parts.push(track.artist)
  if (track.title) parts.push(track.title)

  return parts.join(' - ')
}

/**
 * Score a video candidate
 */
function scoreCandidate(
  candidate: { title: string, channelTitle: string, duration: number },
  track: TrackMetadata
): number {
  let score = 0

  // 1. Title similarity (70% weight)
  const expectedTitle = `${track.artist} ${track.title}`.toLowerCase()
  const candidateTitle = candidate.title.toLowerCase()
  const titleSimilarity = compareTwoStrings(expectedTitle, candidateTitle)
  score += titleSimilarity * 0.7

  // 2. Channel trust (15% weight)
  const channelBoost = BOOST_CHANNELS.some(keyword =>
    candidate.channelTitle.includes(keyword)
  ) ? 0.15 : 0
  score += channelBoost

  // 3. Duration match (10% weight)
  if (track.duration && candidate.duration) {
    const durationDiff = Math.abs(candidate.duration - track.duration)
    const tolerance = track.duration * 0.1 // 10% tolerance
    const durationScore = durationDiff <= tolerance ? 0.1 : 0
    score += durationScore
  }

  // 4. CRITICAL PENALTY - Automatic rejection for full albums
  const hasCriticalPenalty = CRITICAL_PENALTY_KEYWORDS.some(keyword =>
    candidateTitle.includes(keyword)
  )
  if (hasCriticalPenalty) {
    return 0 // Immediate rejection
  }

  // 5. Strong penalty for videos longer than 8 minutes (likely full albums or DJ sets)
  if (candidate.duration > 480) {
    return 0 // Immediate rejection for long videos
  }

  // 6. Regular penalty for unwanted keywords (40% penalty - doubled)
  const hasPenaltyKeyword = PENALTY_KEYWORDS.some(keyword =>
    candidateTitle.includes(keyword)
  )
  if (hasPenaltyKeyword) {
    score -= 0.4
  }

  // 7. Boost for videos with track-specific titles (contains track artist + title)
  const trackTitleLower = track.title.toLowerCase()
  if (candidateTitle.includes(trackTitleLower)) {
    score += 0.1
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT4M33S -> 273 seconds
 */
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}
