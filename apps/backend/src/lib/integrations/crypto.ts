import crypto from "crypto"

const ALGO = "aes-256-gcm"

/**
 * Derives a 32-byte key from INTEGRATIONS_ENCRYPTION_KEY. A 64 char hex string
 * is used as-is, anything else is hashed with SHA-256.
 */
export function deriveKey(secret: string | undefined): Buffer {
  if (!secret) {
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32`."
    )
  }
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex")
  }
  return crypto.createHash("sha256").update(secret).digest()
}

export function encryptJson(value: Record<string, unknown>, key: Buffer): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return ["v1", iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(".")
}

export function decryptJson(payload: string | null | undefined, key: Buffer): Record<string, unknown> {
  if (!payload) {
    return {}
  }
  const [version, iv, tag, data] = payload.split(".")
  if (version !== "v1" || !iv || !tag || !data) {
    throw new Error("Unsupported encrypted payload format")
  }
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  const out = Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()])
  return JSON.parse(out.toString("utf8"))
}

/** Masks a secret for display: only reveals that a value exists. */
export function maskSecret(value: unknown): string | null {
  if (typeof value !== "string" || !value.length) {
    return null
  }
  return value.length <= 8 ? "••••" : `••••${value.slice(-4)}`
}

/** JSON columns are typed as objects; arrays are valid JSON too. */
export const asJson = (v: unknown) => v as Record<string, unknown>
