import crypto from "crypto"
import { FetchLike, ProviderError, requestJson } from "./http"

/**
 * Meta Graph API client: catalog batch API (items_batch) and Conversions API.
 */
export type MetaConfig = {
  access_token: string
  catalog_id?: string
  pixel_id?: string
  graph_version?: string
  test_event_code?: string
}

export type MetaCatalogItem = {
  id: string
  item_group_id?: string
  title: string
  description: string
  availability: "in stock" | "out of stock" | "preorder" | "available for order"
  condition: "new" | "refurbished" | "used"
  price: string
  sale_price?: string
  link: string
  image_link: string
  additional_image_link?: string[]
  brand: string
  color?: string
  size?: string
  gtin?: string
  google_product_category?: string
  inventory?: number
}

export type MetaServerEvent = {
  event_name: string
  event_time: number
  event_id?: string
  event_source_url?: string
  action_source: "website"
  user_data: Record<string, unknown>
  custom_data?: Record<string, unknown>
}

export class MetaClient {
  private readonly version: string

  constructor(private readonly cfg: MetaConfig, private readonly fetchImpl: FetchLike = fetch) {
    if (!cfg.access_token) {
      throw new ProviderError("meta", "not_configured", "Meta access token is not configured")
    }
    this.version = cfg.graph_version || "v24.0"
  }

  private async call<T>(method: string, path: string, params: Record<string, unknown> = {}) {
    const url = new URL(`https://graph.facebook.com/${this.version}/${path.replace(/^\//, "")}`)
    const init: RequestInit = { method, headers: { Authorization: `Bearer ${this.cfg.access_token}` } }
    if (method === "GET") {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, typeof v === "string" ? v : JSON.stringify(v))
    } else {
      init.headers = { ...init.headers, "Content-Type": "application/json" }
      init.body = JSON.stringify(params)
    }
    try {
      return await requestJson<T>("meta", url.toString(), { ...init, fetchImpl: this.fetchImpl })
    } catch (e) {
      if (e instanceof ProviderError) {
        const code = (e.details as any)?.error?.code
        // 190 = invalid/expired token, 10/200 = permission errors
        if (code === 190) throw new ProviderError("meta", "authentication", e.message, e.status, e.details)
        if (code === 10 || (code >= 200 && code < 300)) throw new ProviderError("meta", "authorization", e.message, e.status, e.details)
        if (code === 4 || code === 17 || code === 32 || code === 613) throw new ProviderError("meta", "rate_limited", e.message, e.status, e.details)
      }
      throw e
    }
  }

  getCatalog() {
    if (!this.cfg.catalog_id) throw new ProviderError("meta", "not_configured", "Catalog ID is not configured")
    return this.call<{ id: string; name: string; product_count?: number }>("GET", this.cfg.catalog_id, {
      fields: "id,name,product_count",
    })
  }

  getPixel() {
    if (!this.cfg.pixel_id) throw new ProviderError("meta", "not_configured", "Pixel ID is not configured")
    return this.call<{ id: string; name: string }>("GET", this.cfg.pixel_id, { fields: "id,name" })
  }

  /** Upserts/deletes catalog items. Returns batch handles for status polling. */
  itemsBatch(requests: Array<{ method: "UPDATE" | "DELETE" | "CREATE"; data: Partial<MetaCatalogItem> & { id: string } }>) {
    if (!this.cfg.catalog_id) throw new ProviderError("meta", "not_configured", "Catalog ID is not configured")
    return this.call<{ handles: string[] }>("POST", `${this.cfg.catalog_id}/items_batch`, {
      item_type: "PRODUCT_ITEM",
      allow_upsert: true,
      requests,
    })
  }

  checkBatch(handle: string) {
    return this.call<{
      data: Array<{ status: string; errors?: Array<{ message: string; id?: string }>; warnings?: Array<{ message: string }> }>
    }>("GET", `${this.cfg.catalog_id}/check_batch_request_status`, { handle })
  }

  sendEvents(events: MetaServerEvent[]) {
    if (!this.cfg.pixel_id) throw new ProviderError("meta", "not_configured", "Pixel ID is not configured")
    return this.call<{ events_received: number; fbtrace_id: string }>("POST", `${this.cfg.pixel_id}/events`, {
      data: events,
      ...(this.cfg.test_event_code ? { test_event_code: this.cfg.test_event_code } : {}),
    })
  }
}

export const sha256 = (v: string) => crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex")

/** Validates X-Hub-Signature-256 of a Meta webhook payload. */
export function verifyMetaSignature(rawBody: string | Buffer, header: string | undefined, appSecret: string): boolean {
  if (!header?.startsWith("sha256=") || !appSecret) return false
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")
  const given = header.slice(7)
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}
