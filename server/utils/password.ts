import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Password hashing with Node's built-in scrypt (no external dependency).
 * Stored format: "<salt-hex>:<derived-key-hex>".
 */

const KEY_LEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, KEY_LEN).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const [salt, keyHex] = stored.split(':')
  if (!salt || !keyHex) return false

  const keyBuf = Buffer.from(keyHex, 'hex')
  const derived = scryptSync(password, salt, KEY_LEN)
  // Length check guards timingSafeEqual (it throws on mismatched lengths).
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived)
}
