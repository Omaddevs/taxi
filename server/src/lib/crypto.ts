import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from '../config/env.js'

const ALGO = 'aes-256-gcm'

function key(): Buffer {
  const buf = Buffer.from(env.INSTAGRAM_TOKEN_ENC_KEY, 'hex')
  if (buf.length !== 32) {
    throw new Error('INSTAGRAM_TOKEN_ENC_KEY must be a 32-byte hex string to encrypt secrets')
  }
  return buf
}

// iv:authTag:ciphertext, each hex-encoded — self-contained so decryptSecret needs no extra state.
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
}

export function decryptSecret(encoded: string): string {
  const [ivHex, authTagHex, ciphertextHex] = encoded.split(':')
  if (!ivHex || !authTagHex || !ciphertextHex) throw new Error('Malformed encrypted secret')
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]).toString('utf8')
}
