import { FetchLike, ProviderError, requestJson } from "./http"
import { getGoogleAccessToken, parseServiceAccount } from "./google-auth"

/**
 * Google Merchant API client (merchantapi.googleapis.com, products_v1 /
 * accounts_v1 / datasources_v1). The Content API for Shopping is retired and
 * intentionally not used.
 */
const BASE = "https://merchantapi.googleapis.com"
const SCOPE = "https://www.googleapis.com/auth/content"

export type MerchantPrice = { amountMicros: string; currencyCode: string }

export type MerchantProductAttributes = {
  title?: string
  description?: string
  link?: string
  imageLink?: string
  additionalImageLinks?: string[]
  availability?: "IN_STOCK" | "OUT_OF_STOCK" | "PREORDER" | "BACKORDER"
  condition?: "NEW" | "REFURBISHED" | "USED"
  price?: MerchantPrice
  salePrice?: MerchantPrice
  brand?: string
  gtins?: string[]
  mpn?: string
  identifierExists?: boolean
  itemGroupId?: string
  color?: string
  size?: string
  sizeSystem?: string
  gender?: string
  ageGroup?: string
  material?: string
  googleProductCategory?: string
  productTypes?: string[]
}

export type MerchantProductInput = {
  offerId: string
  contentLanguage: string
  feedLabel: string
  productAttributes: MerchantProductAttributes
}

export type MerchantConfig = {
  merchant_id: string
  data_source_id: string
  service_account_json: unknown
}

export function encodeProductName(contentLanguage: string, feedLabel: string, offerId: string) {
  return Buffer.from(`${contentLanguage}~${feedLabel}~${offerId}`)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

export class GoogleMerchantClient {
  constructor(private readonly cfg: MerchantConfig, private readonly fetchImpl: FetchLike = fetch) {
    if (!cfg.merchant_id) {
      throw new ProviderError("google_merchant", "not_configured", "Merchant Center account ID is missing")
    }
  }

  private get account() {
    return `accounts/${this.cfg.merchant_id}`
  }

  private get dataSource() {
    return `${this.account}/dataSources/${this.cfg.data_source_id}`
  }

  private async call<T>(method: string, path: string, body?: unknown, query: Record<string, string> = {}) {
    const token = await getGoogleAccessToken(parseServiceAccount(this.cfg.service_account_json), SCOPE, this.fetchImpl)
    const url = new URL(BASE + path)
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
    return requestJson<T>("google_merchant", url.toString(), {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      fetchImpl: this.fetchImpl,
    })
  }

  /** Verifies credentials + that the service account has access to the account. */
  getAccount() {
    return this.call<{ name: string; accountName: string }>("GET", `/accounts/v1/${this.account}`)
  }

  listDataSources() {
    return this.call<{ dataSources?: Array<{ name: string; dataSourceId: string; displayName: string; primaryProductDataSource?: unknown }> }>(
      "GET",
      `/datasources/v1/${this.account}/dataSources`
    )
  }

  /** Creates a primary API product data source for the given feed label / language. */
  createApiDataSource(displayName: string, feedLabel: string, contentLanguage: string, countries: string[]) {
    return this.call<{ name: string; dataSourceId: string }>("POST", `/datasources/v1/${this.account}/dataSources`, {
      displayName,
      primaryProductDataSource: { feedLabel, contentLanguage, countries },
    })
  }

  /** Insert = upsert: replaces an existing input with the same language/label/offerId. */
  insertProductInput(input: MerchantProductInput) {
    if (!this.cfg.data_source_id) {
      throw new ProviderError("google_merchant", "not_configured", "API data source ID is missing")
    }
    return this.call<{ name: string; product: string }>(
      "POST",
      `/products/v1/${this.account}/productInputs:insert`,
      input,
      { dataSource: this.dataSource }
    )
  }

  deleteProductInput(contentLanguage: string, feedLabel: string, offerId: string) {
    const name = `${this.account}/productInputs/${encodeProductName(contentLanguage, feedLabel, offerId)}`
    return this.call<void>("DELETE", `/products/v1/${name}`, undefined, { dataSource: this.dataSource })
  }

  /** Processed product incl. item-level issues and destination statuses. */
  getProduct(contentLanguage: string, feedLabel: string, offerId: string) {
    const name = `${this.account}/products/${encodeProductName(contentLanguage, feedLabel, offerId)}`
    return this.call<{
      name: string
      productStatus?: {
        itemLevelIssues?: Array<{ code: string; severity: string; description: string; attribute?: string; detail?: string }>
        destinationStatuses?: Array<{ reportingContext: string; approvedCountries?: string[]; disapprovedCountries?: string[]; pendingCountries?: string[] }>
      }
    }>("GET", `/products/v1/${name}`)
  }
}

export function toMicros(amount: number): string {
  return String(Math.round(amount * 1_000_000))
}
