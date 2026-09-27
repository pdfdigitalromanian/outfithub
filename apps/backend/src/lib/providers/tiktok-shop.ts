import crypto from "crypto"
import { FetchLike, ProviderError, requestJson } from "./http"

/**
 * TikTok Shop Partner API client (versioned "202309" endpoints).
 * Requests are signed with HMAC-SHA256 as described in the Partner Center
 * "Sign your API request" guide.
 */
export const TIKTOK_SHOP_API = "https://open-api.tiktokglobalshop.com"
export const TIKTOK_SHOP_AUTH = "https://auth.tiktok-shops.com"
export const TIKTOK_SHOP_AUTHORIZE_URL = "https://services.tiktokshop.com/open/authorize"

export type TikTokShopTokens = {
  access_token: string
  access_token_expire_in: number
  refresh_token: string
  refresh_token_expire_in: number
  open_id?: string
  seller_name?: string
  seller_base_region?: string
}

type Envelope<T> = { code: number; message: string; data?: T; request_id?: string }

export function signTikTokShopRequest(
  path: string,
  query: Record<string, string>,
  body: string | undefined,
  appSecret: string
): string {
  const keys = Object.keys(query)
    .filter((k) => k !== "sign" && k !== "access_token")
    .sort()
  let input = path + keys.map((k) => `${k}${query[k]}`).join("")
  if (body) input += body
  input = appSecret + input + appSecret
  return crypto.createHmac("sha256", appSecret).update(input).digest("hex")
}

export class TikTokShopClient {
  constructor(
    private readonly cfg: {
      app_key: string
      app_secret: string
      access_token?: string
      shop_cipher?: string
    },
    private readonly fetchImpl: FetchLike = fetch
  ) {
    if (!cfg.app_key || !cfg.app_secret) {
      throw new ProviderError("tiktok_shop", "not_configured", "TikTok Shop app key / secret are not configured")
    }
  }

  static authorizeUrl(serviceId: string, state: string) {
    const url = new URL(TIKTOK_SHOP_AUTHORIZE_URL)
    url.searchParams.set("service_id", serviceId)
    url.searchParams.set("state", state)
    return url.toString()
  }

  private checkEnvelope<T>(res: Envelope<T>): T {
    if (res.code !== 0) {
      const authCodes = [105000, 105001, 105002, 105003, 105005, 36004004]
      const kind = authCodes.includes(res.code) ? "authentication" : res.code === 105004 ? "authorization" : "bad_request"
      throw new ProviderError("tiktok_shop", kind, `TikTok Shop: ${res.message} (code ${res.code})`, undefined, res)
    }
    return res.data as T
  }

  async exchangeAuthCode(authCode: string): Promise<TikTokShopTokens> {
    const url = new URL(`${TIKTOK_SHOP_AUTH}/api/v2/token/get`)
    url.searchParams.set("app_key", this.cfg.app_key)
    url.searchParams.set("app_secret", this.cfg.app_secret)
    url.searchParams.set("auth_code", authCode)
    url.searchParams.set("grant_type", "authorized_code")
    return this.checkEnvelope(await requestJson<Envelope<TikTokShopTokens>>("tiktok_shop", url.toString(), { fetchImpl: this.fetchImpl }))
  }

  async refreshToken(refreshToken: string): Promise<TikTokShopTokens> {
    const url = new URL(`${TIKTOK_SHOP_AUTH}/api/v2/token/refresh`)
    url.searchParams.set("app_key", this.cfg.app_key)
    url.searchParams.set("app_secret", this.cfg.app_secret)
    url.searchParams.set("refresh_token", refreshToken)
    url.searchParams.set("grant_type", "refresh_token")
    return this.checkEnvelope(await requestJson<Envelope<TikTokShopTokens>>("tiktok_shop", url.toString(), { fetchImpl: this.fetchImpl }))
  }

  private async call<T>(
    method: string,
    path: string,
    opts: { query?: Record<string, string>; body?: unknown; shopScoped?: boolean; form?: FormData } = {}
  ): Promise<T> {
    if (!this.cfg.access_token) {
      throw new ProviderError("tiktok_shop", "authorization", "TikTok Shop seller authorization is required")
    }
    const query: Record<string, string> = {
      app_key: this.cfg.app_key,
      timestamp: String(Math.floor(Date.now() / 1000)),
      ...(opts.query ?? {}),
    }
    if (opts.shopScoped !== false) {
      if (!this.cfg.shop_cipher) {
        throw new ProviderError("tiktok_shop", "authorization", "No authorized TikTok shop (shop_cipher missing)")
      }
      query.shop_cipher = this.cfg.shop_cipher
    }
    const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    query.sign = signTikTokShopRequest(path, query, opts.form ? undefined : body, this.cfg.app_secret)
    const url = new URL(TIKTOK_SHOP_API + path)
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
    const headers: Record<string, string> = { "x-tts-access-token": this.cfg.access_token }
    if (!opts.form) headers["Content-Type"] = "application/json"
    const res = await requestJson<Envelope<T>>("tiktok_shop", url.toString(), {
      method,
      headers,
      body: opts.form ?? body,
      fetchImpl: this.fetchImpl,
    })
    return this.checkEnvelope(res)
  }

  getAuthorizedShops() {
    return this.call<{ shops: Array<{ id: string; name: string; region: string; cipher: string; code: string }> }>(
      "GET",
      "/authorization/202309/shops",
      { shopScoped: false }
    )
  }

  getWarehouses() {
    return this.call<{ warehouses: Array<{ id: string; name: string; type: string; is_default: boolean }> }>(
      "GET",
      "/logistics/202309/warehouses"
    )
  }

  async uploadImage(image: Buffer, filename: string, useCase: "MAIN_IMAGE" | "ATTRIBUTE_IMAGE" = "MAIN_IMAGE") {
    const form = new FormData()
    form.append("data", new Blob([new Uint8Array(image)]), filename)
    form.append("use_case", useCase)
    return this.call<{ uri: string; url: string }>("POST", "/product/202309/images/upload", { form })
  }

  createProduct(body: TikTokShopProductBody) {
    return this.call<{ product_id: string; skus: Array<{ id: string; seller_sku: string }> }>(
      "POST",
      "/product/202309/products",
      { body }
    )
  }

  editProduct(productId: string, body: TikTokShopProductBody) {
    return this.call<{ product_id: string; skus: Array<{ id: string; seller_sku: string }> }>(
      "PUT",
      `/product/202309/products/${productId}`,
      { body }
    )
  }

  deleteProducts(productIds: string[]) {
    return this.call<{ errors?: unknown[] }>("DELETE", "/product/202309/products", { body: { product_ids: productIds } })
  }

  updateInventory(productId: string, skus: Array<{ id: string; inventory: Array<{ warehouse_id: string; quantity: number }> }>) {
    return this.call<unknown>("POST", `/product/202309/products/${productId}/inventory/update`, { body: { skus } })
  }

  updatePrices(productId: string, skus: Array<{ id: string; price: { amount: string; currency: string } }>) {
    return this.call<unknown>("POST", `/product/202309/products/${productId}/prices/update`, { body: { skus } })
  }
}

export type TikTokShopProductBody = {
  title: string
  description: string
  category_id: string
  brand_id?: string
  main_images: Array<{ uri: string }>
  skus: Array<{
    seller_sku: string
    price: { amount: string; currency: string }
    inventory: Array<{ warehouse_id: string; quantity: number }>
    sales_attributes?: Array<{ name: string; value_name: string }>
    identifier_code?: { code: string; type: "GTIN" | "EAN" | "UPC" | "ISBN" }
  }>
  package_weight: { value: string; unit: "KILOGRAM" | "POUND" }
  is_cod_allowed?: boolean
}
