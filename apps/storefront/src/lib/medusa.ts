import "server-only"
import Medusa from "@medusajs/js-sdk"
import { PUBLISHABLE_KEY } from "./env"

/**
 * Server-only Medusa client. All commerce calls happen on the server (server
 * components, server actions and route handlers); the browser never talks to
 * Medusa directly, so auth tokens stay in httpOnly cookies.
 */
export const BACKEND_URL = (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")

export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  debug: false,
  publishableKey: PUBLISHABLE_KEY,
})
