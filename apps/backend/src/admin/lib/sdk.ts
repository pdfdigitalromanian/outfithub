import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})

export async function api<T = any>(path: string, init: { method?: string; body?: unknown; query?: Record<string, unknown> } = {}) {
  return sdk.client.fetch<T>(path, {
    method: init.method ?? "GET",
    body: init.body as any,
    query: init.query as any,
  })
}
