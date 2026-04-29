import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey() {
  return Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function safeDecrypt(text: string): string {
  try {
    const key = getKey()
    const buf = Buffer.from(text, 'base64')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const encrypted = buf.subarray(28)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted) + decipher.final('utf8')
  } catch {
    return text
  }
}