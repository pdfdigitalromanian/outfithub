import { redactSecrets } from "../integrations/redact"
export type ProviderErrorKind =
  | "not_configured"
  | "authentication"
  | "authorization"
  | "bad_request"
  | "not_found"
  | "rate_limited"
  | "server"
  | "network"

/** Normalized error thrown by every external provider client. */
export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly kind: ProviderErrorKind,
    message: string,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "ProviderError"
  }

  /** Whether retrying later may succeed. */
  get retryable() {
    return this.kind === "rate_limited" || this.kind === "server" || this.kind === "network"
  }

  /** Maps to the integration connection status shown in the admin. */
  get connectionStatus(): "not_configured" | "authorization_required" | "error" {
    if (this.kind === "not_configured") {
      return "not_configured"
    }
    if (this.kind === "authorization" || this.kind === "authentication") {
      return "authorization_required"
    }
    return "error"
  }
}

export function kindFromStatus(status: number): ProviderErrorKind {
  if (status === 401) return "authentication"
  if (status === 403) return "authorization"
  if (status === 404) return "not_found"
  if (status === 429) return "rate_limited"
  if (status >= 500) return "server"
  return "bad_request"
}

export type FetchLike = typeof fetch

export async function requestJson<T = any>(
  provider: string,
  url: string,
  init: RequestInit & { timeoutMs?: number; fetchImpl?: FetchLike } = {}
): Promise<T> {
  const { timeoutMs = 20000, fetchImpl = fetch, ...rest } = init
  const requestSecrets: Record<string, unknown> = {}
  const headers = new Headers(rest.headers)
  for (const key of ["authorization", "access-token", "x-tts-access-token", "x-auth-token"]) {
    const value = headers.get(key)
    if (value) requestSecrets[key] = value.replace(/^Bearer\s+/i, "")
  }
  const parsedUrl = new URL(url)
  for (const key of ["access_token", "client_secret", "api_secret", "refresh_token"]) {
    const value = parsedUrl.searchParams.get(key)
    if (value) requestSecrets[key] = value
  }
  // Keep the deadline alive through body consumption, not just response headers.
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = rest.signal ? AbortSignal.any([rest.signal, timeout]) : timeout
  try {
    const res = await fetchImpl(url, { ...rest, signal })
    const text = await res.text()
    let body: any = null
    if (text) {
      try { body = JSON.parse(text) } catch { body = text }
    }
    if (!res.ok) {
      const message = redactSecrets(extractMessage(body) || `${provider} responded with HTTP ${res.status}`, requestSecrets)
      throw new ProviderError(provider, kindFromStatus(res.status), message, res.status, body)
    }
    return body as T
  } catch (e) {
    if (e instanceof ProviderError) throw e
    throw new ProviderError(provider, "network", `Network error calling ${provider}: ${(e as Error).message}`)
  }
}

function extractMessage(body: any): string | null {
  if (!body) return null
  if (typeof body === "string") return body.slice(0, 500)
  return (
    body?.error?.message ||
    body?.error_description ||
    body?.message ||
    body?.error?.error_user_msg ||
    (typeof body?.error === "string" ? body.error : null) ||
    null
  )
}
