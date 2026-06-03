import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

/**
 * Downloads full-track audio from YouTube (via yt-dlp + ffmpeg) as MP3 and
 * caches it on disk, so the browser's Web Audio engine can fetch + decode it.
 *
 * MP3 is chosen because Safari/iOS `decodeAudioData` can't decode the WebM/Opus
 * that YouTube usually serves. Like the analysis worker, this needs yt-dlp +
 * ffmpeg available locally, so it runs on the dev machine / host, not serverless.
 */

const CACHE_DIR = process.env.AUDIO_CACHE_DIR || join(tmpdir(), 'groove-audio')

export function cachedAudioPath(videoId: string) {
  return join(CACHE_DIR, `${videoId}.mp3`)
}

// Dedupe concurrent downloads of the same video
const inflight = new Map<string, Promise<string>>()

export async function getCachedAudio(videoId: string): Promise<string> {
  const out = cachedAudioPath(videoId)
  if (existsSync(out)) return out

  const existing = inflight.get(videoId)
  if (existing) return existing

  const job = downloadAudio(videoId, out).finally(() => inflight.delete(videoId))
  inflight.set(videoId, job)
  return job
}

function downloadAudio(videoId: string, outPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    mkdir(CACHE_DIR, { recursive: true })
      .then(() => {
        const cookiesPath = process.env.YOUTUBE_COOKIES_PATH
        const url = `https://youtube.com/watch?v=${videoId}`
        // yt-dlp appends the real extension to the -o template; with
        // --audio-format mp3 the result is `<videoId>.mp3`.
        const template = join(CACHE_DIR, `${videoId}.%(ext)s`)
        const args = [
          ...(cookiesPath ? ['--cookies', cookiesPath] : []),
          '-f', 'bestaudio',
          '-x', '--audio-format', 'mp3', '--audio-quality', '0',
          '--no-playlist', '--quiet', '--no-warnings',
          '-o', template,
          url,
        ]

        console.log(`[Audio Cache] Downloading audio for ${videoId}`)
        const proc = spawn('yt-dlp', args)
        let stderr = ''
        proc.stderr.on('data', (d) => { stderr += d.toString() })
        proc.on('error', (e) => reject(new Error(`yt-dlp not installed: ${e.message}`)))
        proc.on('close', (code) => {
          if (code === 0 && existsSync(outPath)) {
            console.log(`[Audio Cache] Cached ${videoId}.mp3`)
            resolve(outPath)
          } else {
            reject(new Error(`yt-dlp failed (code ${code}): ${stderr.slice(0, 400)}`))
          }
        })
      })
      .catch(reject)
  })
}
