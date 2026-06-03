import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { tmpdir } from 'os'

// GUI/IDE-launched dev servers don't inherit the shell PATH, so `yt-dlp` /
// `ffmpeg` aren't found (spawn ENOENT). Resolve them from common install dirs
// (or *_PATH env overrides) and enrich the child PATH so yt-dlp finds ffmpeg.
const BIN_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin']

function findBinary(name: string, override?: string): string {
  if (override && existsSync(override)) return override
  for (const dir of BIN_DIRS) {
    const p = join(dir, name)
    if (existsSync(p)) return p
  }
  return name // fall back to PATH
}

const YTDLP_BIN = findBinary('yt-dlp', process.env.YTDLP_PATH)
const FFMPEG_BIN = findBinary('ffmpeg', process.env.FFMPEG_PATH)
const FFMPEG_DIR = FFMPEG_BIN.includes('/') ? dirname(FFMPEG_BIN) : null
const ENRICHED_PATH = Array.from(new Set([...BIN_DIRS, ...(process.env.PATH?.split(':') || [])])).join(':')

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
          ...(FFMPEG_DIR ? ['--ffmpeg-location', FFMPEG_DIR] : []),
          '-f', 'bestaudio',
          '-x', '--audio-format', 'mp3', '--audio-quality', '0',
          '--no-playlist', '--quiet', '--no-warnings',
          '-o', template,
          url,
        ]

        console.log(`[Audio Cache] Downloading audio for ${videoId} (yt-dlp: ${YTDLP_BIN})`)
        const proc = spawn(YTDLP_BIN, args, { env: { ...process.env, PATH: ENRICHED_PATH } })
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
