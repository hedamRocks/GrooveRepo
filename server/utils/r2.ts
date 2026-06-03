/**
 * Cloudflare R2 (S3-compatible) helper for the dual-deck audio cache.
 *
 * The worker uploads each track's MP3 here; the app presigns a short-lived GET
 * URL and redirects the player to it. If the R2_* env vars aren't set,
 * r2Configured() is false and callers fall back to local streaming.
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createReadStream, statSync } from 'fs'

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_BUCKET

export function r2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucket)
}

export function audioKey(videoId: string): string {
  return `audio/${videoId}.mp3`
}

let client: S3Client | null = null
function getClient(): S3Client {
  if (!r2Configured()) throw new Error('R2 is not configured')
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    })
  }
  return client
}

/** Upload a local file to R2 under the given key. */
export async function uploadAudioFile(key: string, filePath: string): Promise<void> {
  const c = getClient()
  await c.send(new PutObjectCommand({
    Bucket: bucket!,
    Key: key,
    Body: createReadStream(filePath),
    ContentLength: statSync(filePath).size,
    ContentType: 'audio/mpeg',
  }))
}

/** Short-lived signed GET URL the browser can stream from directly. */
export async function presignAudioUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const c = getClient()
  return getSignedUrl(c, new GetObjectCommand({ Bucket: bucket!, Key: key }), {
    expiresIn: expiresInSeconds,
  })
}
