/**
 * Cookie consent state (Legea 506/2004 / ePrivacy + GDPR). Stored in a
 * first-party cookie so the server can read it too. Versioned so a policy
 * change can re-prompt everyone.
 */
export const CONSENT_COOKIE = "oh_consent"
export const CONSENT_VERSION = 1

export type ConsentState = {
  v: number
  necessary: true
  preferences: boolean
  analytics: boolean
  marketing: boolean
  ts: number
}

export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  if (!raw) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(raw.split("=").slice(1).join("=")))
    return parsed?.v === CONSENT_VERSION ? parsed : null
  } catch {
    return null
  }
}

export function writeConsent(state: Omit<ConsentState, "v" | "necessary" | "ts">): ConsentState {
  const full: ConsentState = { v: CONSENT_VERSION, necessary: true, ts: Date.now(), ...state }
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(full))}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`
  return full
}

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))
  return raw ? decodeURIComponent(raw.split("=").slice(1).join("=")) : undefined
}
