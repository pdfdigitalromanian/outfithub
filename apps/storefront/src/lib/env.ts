/** Centralized environment access. Only NEXT_PUBLIC_* values reach the browser. */
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "")
export const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_REGION || "ro").toLowerCase()
export const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
export const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY || ""
export const LOCALE = "ro-RO"
