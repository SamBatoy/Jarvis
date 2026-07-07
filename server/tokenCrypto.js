import crypto from 'node:crypto'

// AES-256-GCM encryption for OAuth tokens, independent of Supabase's own
// disk-level encryption and independent of SUPABASE_SERVICE_ROLE_KEY — a
// leak of one secret alone should never expose a usable token.
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // standard for GCM

function getKey() {
  const keyB64 = process.env.TOKEN_ENCRYPTION_KEY
  if (!keyB64) throw new Error('Missing TOKEN_ENCRYPTION_KEY in the server environment.')
  const key = Buffer.from(keyB64, 'base64url')
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).')
  return key
}

// Encodes iv:authTag:ciphertext (all base64url) into one string so a single
// text column holds everything needed to decrypt.
export function encrypt(plaintext) {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv, authTag, ciphertext].map((b) => b.toString('base64url')).join(':')
}

export function decrypt(encoded) {
  const key = getKey()
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(':')
  const iv = Buffer.from(ivB64, 'base64url')
  const authTag = Buffer.from(authTagB64, 'base64url')
  const ciphertext = Buffer.from(ciphertextB64, 'base64url')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
