import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { decryptToken, encryptToken } from './tokens'

/**
 * Two distinct, valid 32-byte keys (base64). These are TEST-ONLY keys generated
 * with `openssl rand -base64 32`; they encrypt nothing but the throwaway strings
 * in these tests, so committing them is safe. No real Sanity token or real
 * SANITY_TOKEN_ENC_KEY ever appears here.
 */
const KEY_A = 'vNY7ghfaYm2Vxl/kqHoVauSG5J5Y8jePkvKjNH1dHgY='
const KEY_B = 'RZ+epAEp4i/DZ75EhAohNDLANlaj0xKtJE1Iq7a8LdA='
/** A 16-byte key — valid base64 but the wrong length for AES-256. */
const KEY_16_BYTES = 'fPf4FcJ7k6Xw8/vbRUm/0Q=='

const SAMPLE_TOKEN = 'sk-test-DUMMY-sanity-editor-token-1234567890'

const ORIGINAL_KEY = process.env.SANITY_TOKEN_ENC_KEY

beforeEach(() => {
  process.env.SANITY_TOKEN_ENC_KEY = KEY_A
})

afterEach(() => {
  // Restore whatever (if anything) was set before the suite ran.
  if (ORIGINAL_KEY === undefined) {
    delete process.env.SANITY_TOKEN_ENC_KEY
  } else {
    process.env.SANITY_TOKEN_ENC_KEY = ORIGINAL_KEY
  }
})

describe('encryptToken / decryptToken', () => {
  it('round-trips: decrypt(encrypt(x)) === x', () => {
    const sealed = encryptToken(SAMPLE_TOKEN)
    expect(decryptToken(sealed)).toBe(SAMPLE_TOKEN)
  })

  it('emits base64 parts and never the plaintext', () => {
    const sealed = encryptToken(SAMPLE_TOKEN)

    // Shape: three non-empty base64 strings.
    const base64 = /^[A-Za-z0-9+/]+={0,2}$/
    expect(sealed.ciphertext).toMatch(base64)
    expect(sealed.iv).toMatch(base64)
    expect(sealed.authTag).toMatch(base64)

    // The 12-byte IV and 16-byte GCM tag have fixed decoded lengths.
    expect(Buffer.from(sealed.iv, 'base64')).toHaveLength(12)
    expect(Buffer.from(sealed.authTag, 'base64')).toHaveLength(16)

    // The plaintext must not be recoverable from the stored ciphertext.
    expect(sealed.ciphertext).not.toContain(SAMPLE_TOKEN)
    expect(
      Buffer.from(sealed.ciphertext, 'base64').toString('utf8'),
    ).not.toContain(SAMPLE_TOKEN)
  })

  it('produces a unique IV and ciphertext for the same input each time', () => {
    const a = encryptToken(SAMPLE_TOKEN)
    const b = encryptToken(SAMPLE_TOKEN)

    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)

    // Both still decrypt back to the same original.
    expect(decryptToken(a)).toBe(SAMPLE_TOKEN)
    expect(decryptToken(b)).toBe(SAMPLE_TOKEN)
  })

  it('throws when the ciphertext is tampered with', () => {
    const sealed = encryptToken(SAMPLE_TOKEN)
    const bytes = Buffer.from(sealed.ciphertext, 'base64')
    bytes[0] ^= 0xff // flip a byte
    const tampered = { ...sealed, ciphertext: bytes.toString('base64') }

    expect(() => decryptToken(tampered)).toThrow()
  })

  it('throws when the auth tag is tampered with', () => {
    const sealed = encryptToken(SAMPLE_TOKEN)
    const tag = Buffer.from(sealed.authTag, 'base64')
    tag[0] ^= 0xff
    const tampered = { ...sealed, authTag: tag.toString('base64') }

    expect(() => decryptToken(tampered)).toThrow()
  })

  it('throws when decrypting with the wrong key', () => {
    const sealed = encryptToken(SAMPLE_TOKEN)
    process.env.SANITY_TOKEN_ENC_KEY = KEY_B // different valid key

    expect(() => decryptToken(sealed)).toThrow()
  })
})

describe('key validation', () => {
  it('throws a clear error when the key is missing', () => {
    delete process.env.SANITY_TOKEN_ENC_KEY
    expect(() => encryptToken(SAMPLE_TOKEN)).toThrow(/SANITY_TOKEN_ENC_KEY/)
  })

  it('throws when the key is not 32 bytes', () => {
    process.env.SANITY_TOKEN_ENC_KEY = KEY_16_BYTES
    expect(() => encryptToken(SAMPLE_TOKEN)).toThrow(/32 bytes/)
  })
})

describe('input validation', () => {
  it('rejects an empty plaintext', () => {
    expect(() => encryptToken('')).toThrow(/non-empty/)
  })

  it('rejects an incomplete EncryptedToken', () => {
    expect(() =>
      decryptToken({ ciphertext: '', iv: 'aaaa', authTag: 'bbbb' }),
    ).toThrow(/required/)
  })
})
