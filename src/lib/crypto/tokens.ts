import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Application-layer encryption for per-client Sanity Editor tokens.
 *
 * Why this exists (see `dashboard-Decisions.md` 2026-06-27 and AGENTS.md →
 * Security boundary): a per-client Sanity write token is the key to editing one
 * client's live blog. We never store it in plaintext. It is encrypted here with
 * AES-256-GCM and only the ciphertext + IV + auth tag land in the database
 * (`client_secrets`). The 32-byte key lives ONLY in the server-side env var
 * `SANITY_TOKEN_ENC_KEY`, never in the database. So a database dump — or even a
 * service-role key leak — cannot reveal a token without ALSO stealing the
 * separate app key. Decrypting/using tokens is wired in B.04; this module is the
 * vault, and it is `server-only` so it can never be bundled to the browser.
 *
 * GCM gives us authenticated encryption: any tampering with the ciphertext or
 * auth tag, or use of the wrong key, makes `decryptToken` throw rather than
 * return corrupted plaintext.
 */

const ALGORITHM = 'aes-256-gcm'
/** AES-256 requires a 32-byte key. */
const KEY_BYTES = 32
/** 96-bit IV is the recommended nonce size for GCM. A fresh one per encryption. */
const IV_BYTES = 12

/** The three base64 parts that together let us recover one token. */
export interface EncryptedToken {
  /** AES-256-GCM ciphertext, base64. */
  ciphertext: string
  /** The 12-byte random IV used for this encryption, base64. */
  iv: string
  /** The 16-byte GCM authentication tag, base64. */
  authTag: string
}

/**
 * Reads and validates the encryption key from the environment at call time (not
 * at module load), so tests and scripts can set it just before use. Throws a
 * clear, actionable error if it is missing or not exactly 32 bytes once base64
 * decoded.
 */
function getKey(): Buffer {
  const raw = process.env.SANITY_TOKEN_ENC_KEY
  if (!raw) {
    throw new Error(
      'Missing SANITY_TOKEN_ENC_KEY. It must be a 32-byte key, base64-encoded ' +
        '(generate with: openssl rand -base64 32). Set it server-side only — in ' +
        '.env.local locally and in the Vercel project settings — never as a ' +
        'NEXT_PUBLIC_* variable and never committed.',
    )
  }

  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `SANITY_TOKEN_ENC_KEY must decode to exactly ${KEY_BYTES} bytes, but got ` +
        `${key.length}. Generate a correct one with: openssl rand -base64 32`,
    )
  }
  return key
}

/**
 * Encrypts a token string with AES-256-GCM under a fresh random IV.
 * Returns the ciphertext, IV, and auth tag as base64 strings for storage.
 */
export function encryptToken(plaintext: string): EncryptedToken {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('encryptToken: plaintext must be a non-empty string.')
  }

  const key = getKey()
  const iv = randomBytes(IV_BYTES)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  }
}

/**
 * Decrypts an {@link EncryptedToken} back to the original token string.
 *
 * Throws if the ciphertext/auth tag was tampered with or the key is wrong: GCM
 * verification fails in `decipher.final()`. Callers should treat any throw as
 * "this token is unusable" and never fall back to unauthenticated plaintext.
 */
export function decryptToken({ ciphertext, iv, authTag }: EncryptedToken): string {
  if (!ciphertext || !iv || !authTag) {
    throw new Error(
      'decryptToken: ciphertext, iv, and authTag are all required.',
    )
  }

  const key = getKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ])
  return plaintext.toString('utf8')
}
