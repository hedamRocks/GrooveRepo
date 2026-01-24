import { spawn } from 'child_process'
import { Readable } from 'stream'

/**
 * Audio Streaming Pipeline
 * Streams audio from YouTube without saving files
 * Requires yt-dlp to be installed globally
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

export interface AudioStreamOptions {
  videoId: string
  format?: 'mp3' | 'wav'  // Default: mp3
  sampleStart?: number  // Start time in seconds
  sampleDuration?: number  // Duration in seconds
}

/**
 * Stream audio from YouTube video
 * Returns a readable stream of audio data
 */
export async function streamAudioFromYouTube(
  options: AudioStreamOptions
): Promise<Readable> {
  const { videoId, format = 'mp3', sampleStart, sampleDuration } = options
  const url = `https://youtube.com/watch?v=${videoId}`

  console.log(`[Audio Streamer] Streaming audio from ${videoId}`)
  if (sampleStart !== undefined && sampleDuration !== undefined) {
    console.log(`[Audio Streamer] Sampling ${sampleDuration}s starting at ${sampleStart}s`)
  }

  // Path to cookies file from environment variable or default
  const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || '/Users/nicolaiolsen/stack/youtube-cookies.txt'

  return new Promise((resolve, reject) => {
    // Build yt-dlp arguments
    const ytdlpArgs = [
      '--cookies', cookiesPath,     // Use cookies for authentication
      '-f', 'bestaudio',            // Best audio quality
      '--no-playlist',              // Don't download playlists
      '-o', '-',                    // Output to stdout
      '--quiet',                    // Minimize output
      '--no-warnings',              // Suppress warnings
    ]

    // Add ffmpeg postprocessor for time-based sampling
    // yt-dlp can pass args to ffmpeg using --postprocessor-args
    if (sampleStart !== undefined && sampleDuration !== undefined) {
      ytdlpArgs.push(
        '--postprocessor-args',
        `ffmpeg:-ss ${sampleStart} -t ${sampleDuration}`
      )
    }

    ytdlpArgs.push(url)

    // Spawn yt-dlp process with cookies for authentication
    const ytdlp = spawn('yt-dlp', ytdlpArgs)

    // Check if yt-dlp is available
    ytdlp.on('error', (error) => {
      console.error('[Audio Streamer] yt-dlp not found:', error)
      reject(new Error('yt-dlp not installed. Install with: brew install yt-dlp (macOS) or pip install yt-dlp'))
    })

    // Handle stderr
    ytdlp.stderr.on('data', (data) => {
      const message = data.toString()
      // Only log actual errors, not progress
      if (message.includes('ERROR') || message.includes('WARNING')) {
        console.error('[Audio Streamer] yt-dlp:', message)
      }
    })

    // Return stdout stream
    resolve(ytdlp.stdout)

    // Handle process exit
    ytdlp.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Audio Streamer] yt-dlp exited with code ${code}`)
      }
    })
  })
}

/**
 * Download audio to buffer (for analysis)
 * This keeps audio in memory temporarily
 */
export async function downloadAudioToBuffer(
  options: AudioStreamOptions
): Promise<Buffer> {
  return retryWithBackoff(
    async () => {
      const stream = await streamAudioFromYouTube(options)

      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []

        stream.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk))
        })

        stream.on('end', () => {
          const buffer = Buffer.concat(chunks)
          console.log(`[Audio Streamer] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
          resolve(buffer)
        })

        stream.on('error', (error) => {
          console.error('[Audio Streamer] Stream error:', error)
          reject(error)
        })
      })
    },
    {
      maxAttempts: 3,
      initialDelayMs: 2000,
      operationName: `Audio download for ${options.videoId}`
    }
  )
}

/**
 * Check if yt-dlp is installed
 */
export async function checkYtDlpInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('yt-dlp', ['--version'])

    process.on('error', () => {
      resolve(false)
    })

    process.on('close', (code) => {
      resolve(code === 0)
    })
  })
}
