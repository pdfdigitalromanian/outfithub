import crypto from "crypto"
import { FetchLike, ProviderError, requestJson } from "./http"

export type ServiceAccountKey = {
  client_email: string
  private_key: string
  token_uri?: string
}

export function parseServiceAccount(raw: unknown): ServiceAccountKey {
  let parsed: any = raw
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new ProviderError("google", "not_configured", "Service account key is not valid JSON")
    }
  }
  if (!parsed?.client_email || !parsed?.private_key) {
    throw new ProviderError("google", "not_configured", "Service account key must contain client_email and private_key")
  }
  return parsed
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")

const tokenCache = new Map<string, { token: string; exp: number }>()

/** OAuth 2.0 JWT bearer flow for Google service accounts (RFC 7523). */
export async function getGoogleAccessToken(
  key: ServiceAccountKey,
  scope: string,
  fetchImpl: FetchLike = fetch
): Promise<string> {
  const cacheKey = `${key.client_email}|${scope}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.exp - Date.now() > 60_000) {
    return cached.token
  }
  const now = Math.floor(Date.now() / 1000)
  const tokenUri = key.token_uri || "https://oauth2.googleapis.com/token"
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claims = b64url(
    JSON.stringify({ iss: key.client_email, scope, aud: tokenUri, iat: now, exp: now + 3600 })
  )
  let signature: string
  try {
    signature = b64url(crypto.createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key.private_key))
  } catch (e) {
    throw new ProviderError("google", "not_configured", `Invalid service account private key: ${(e as Error).message}`)
  }
  const res = await requestJson<{ access_token: string; expires_in: number }>("google", tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }).toString(),
    fetchImpl,
  }).catch((e: ProviderError) => {
    throw new ProviderError("google", "authentication", `Google token exchange failed: ${e.message}`, e.status, e.details)
  })
  tokenCache.set(cacheKey, { token: res.access_token, exp: Date.now() + res.expires_in * 1000 })
  return res.access_token
}
