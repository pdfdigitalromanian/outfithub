/**
 * Declarative description of every external integration. The admin UI renders
 * configuration forms from these definitions; the backend uses them to validate
 * input and to decide which fields are secrets (encrypted, write-only) and which
 * are public (safe to expose to the storefront, e.g. pixel IDs).
 */
export type IntegrationFieldType = "text" | "password" | "textarea" | "select" | "boolean" | "number"

export type IntegrationField = {
  key: string
  label: string
  type: IntegrationFieldType
  required?: boolean
  secret?: boolean
  public?: boolean
  help?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  default?: string | number | boolean
}

export type IntegrationDefinition = {
  provider: IntegrationProvider
  name: string
  category: "sales_channel" | "tracking" | "shipping" | "analytics"
  description: string
  docs_url: string
  oauth?: boolean
  fields: IntegrationField[]
}

export const INTEGRATION_PROVIDERS = [
  "google_merchant",
  "google_analytics",
  "meta",
  "tiktok_events",
  "tiktok_shop",
  "sameday",
] as const

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number]

export const CHANNEL_PROVIDERS = ["google_merchant", "meta", "tiktok_shop"] as const
export type ChannelProvider = (typeof CHANNEL_PROVIDERS)[number]

export const INTEGRATIONS: Record<IntegrationProvider, IntegrationDefinition> = {
  google_merchant: {
    provider: "google_merchant",
    name: "Google Merchant Center",
    category: "sales_channel",
    description:
      "Publishes products to Google Shopping / free listings through the Merchant API (products v1). Uses a service account that must be added as a user in Merchant Center.",
    docs_url: "https://developers.google.com/merchant/api/guides/quickstart",
    fields: [
      { key: "merchant_id", label: "Merchant Center account ID", type: "text", required: true, placeholder: "123456789" },
      {
        key: "data_source_id",
        label: "API data source ID",
        type: "text",
        required: true,
        help: "Merchant Center → Settings → Data sources → add an API source (or create it via the Test connection helper). Numeric ID.",
      },
      { key: "feed_label", label: "Feed label", type: "text", required: true, default: "RO" },
      { key: "content_language", label: "Content language", type: "text", required: true, default: "ro" },
      { key: "default_brand", label: "Default brand", type: "text", default: "OutfitHub" },
      {
        key: "google_product_category",
        label: "Default Google product category",
        type: "text",
        default: "1604",
        help: "1604 = Apparel & Accessories > Clothing",
      },
      {
        key: "service_account_json",
        label: "Service account JSON key",
        type: "textarea",
        required: true,
        secret: true,
        help: "Google Cloud Console → IAM → Service accounts → Keys → Add key (JSON). Enable the Merchant API in the project.",
      },
    ],
  },
  google_analytics: {
    provider: "google_analytics",
    name: "Google Analytics 4 / Tag Manager",
    category: "analytics",
    description:
      "GA4 measurement (browser, gated by Consent Mode v2) and optional server-side purchase events through the Measurement Protocol.",
    docs_url: "https://developers.google.com/analytics/devguides/collection/protocol/ga4",
    fields: [
      { key: "measurement_id", label: "GA4 Measurement ID", type: "text", required: true, public: true, placeholder: "G-XXXXXXXXXX" },
      { key: "gtm_container_id", label: "Google Tag Manager container ID (optional)", type: "text", public: true, placeholder: "GTM-XXXXXXX" },
      { key: "google_ads_id", label: "Google Ads tag ID (optional)", type: "text", public: true, placeholder: "AW-XXXXXXXXX" },
      {
        key: "api_secret",
        label: "Measurement Protocol API secret",
        type: "password",
        secret: true,
        help: "GA4 Admin → Data streams → your stream → Measurement Protocol API secrets.",
      },
    ],
  },
  meta: {
    provider: "meta",
    name: "Meta (Facebook & Instagram)",
    category: "sales_channel",
    description:
      "Meta Pixel + Conversions API, and product catalog synchronization for Facebook/Instagram Shops and Advantage+ catalog ads.",
    docs_url: "https://developers.facebook.com/docs/marketing-api/catalog",
    fields: [
      { key: "pixel_id", label: "Pixel / dataset ID", type: "text", required: true, public: true },
      { key: "catalog_id", label: "Product catalog ID", type: "text", help: "Commerce Manager → Catalog → Settings." },
      { key: "graph_version", label: "Graph API version", type: "text", default: "v24.0" },
      { key: "test_event_code", label: "Test event code (optional)", type: "text", help: "Events Manager → Test events. Remove in production." },
      {
        key: "access_token",
        label: "System user access token",
        type: "password",
        required: true,
        secret: true,
        help: "Business Settings → Users → System users → Generate token with catalog_management, business_management, ads_management.",
      },
      { key: "app_secret", label: "App secret (webhook signature validation)", type: "password", secret: true },
      { key: "webhook_verify_token", label: "Webhook verify token", type: "password", secret: true },
    ],
  },
  tiktok_events: {
    provider: "tiktok_events",
    name: "TikTok Pixel & Events API",
    category: "tracking",
    description: "Browser TikTok Pixel (consent-gated) and server-side Events API 2.0 for purchase attribution.",
    docs_url: "https://business-api.tiktok.com/portal/docs?id=1771100865818625",
    fields: [
      { key: "pixel_code", label: "Pixel code", type: "text", required: true, public: true },
      { key: "advertiser_id", label: "Advertiser ID (used to verify the connection)", type: "text" },
      { key: "test_event_code", label: "Test event code (optional)", type: "text" },
      { key: "access_token", label: "Events API access token", type: "password", required: true, secret: true },
    ],
  },
  tiktok_shop: {
    provider: "tiktok_shop",
    name: "TikTok Shop",
    category: "sales_channel",
    description:
      "TikTok Shop Partner API (202309 versions): OAuth seller authorization, product listing, price and inventory synchronization. Requires an approved TikTok Shop seller account in a supported market.",
    docs_url: "https://partner.tiktokshop.com/docv2/page/seller-api-overview",
    oauth: true,
    fields: [
      { key: "app_key", label: "App key", type: "text", required: true },
      { key: "service_id", label: "Service ID (authorization link)", type: "text", required: true },
      { key: "category_id", label: "Default TikTok category ID", type: "text", help: "Leaf category from the Get Categories API." },
      { key: "warehouse_id", label: "Warehouse ID", type: "text", help: "Filled automatically after authorization if empty." },
      { key: "brand_id", label: "Brand ID (optional)", type: "text" },
      { key: "package_weight_kg", label: "Default package weight (kg)", type: "number", default: 0.5 },
      { key: "app_secret", label: "App secret", type: "password", required: true, secret: true },
    ],
  },
  sameday: {
    provider: "sameday",
    name: "Sameday Courier",
    category: "shipping",
    description:
      "Home delivery and Easybox lockers: service discovery, Easybox list, AWB creation, PDF labels, tracking and cancellation through the Sameday API.",
    docs_url: "https://sameday.ro/business/integrare-api/",
    fields: [
      {
        key: "environment",
        label: "Environment",
        type: "select",
        required: true,
        default: "production",
        options: [
          { value: "production", label: "Production (api.sameday.ro)" },
          { value: "demo", label: "Demo / sandbox (sameday-api.demo.zitec.com)" },
        ],
      },
      { key: "pickup_point_id", label: "Pickup point ID", type: "text", help: "Loaded from the API after the first successful connection." },
      { key: "contact_person_id", label: "Pickup contact person ID", type: "text" },
      { key: "service_id_home", label: "Service ID – home delivery", type: "text", help: "Usually the “24H” / Next day service." },
      { key: "service_id_locker", label: "Service ID – Easybox", type: "text", help: "Usually “Locker NextDay” (LN)." },
      { key: "default_weight_kg", label: "Default parcel weight (kg)", type: "number", default: 1 },
      { key: "auto_create_awb", label: "Create AWB automatically when a fulfillment is created", type: "boolean", default: true },
      { key: "username", label: "API username", type: "text", required: true, secret: true },
      { key: "password", label: "API password", type: "password", required: true, secret: true },
    ],
  },
}

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value)
}

export function missingRequiredFields(
  provider: IntegrationProvider,
  config: Record<string, unknown>,
  secrets: Record<string, unknown>
): string[] {
  return INTEGRATIONS[provider].fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = f.secret ? secrets[f.key] : config[f.key]
      return v === undefined || v === null || v === ""
    })
    .map((f) => f.key)
}
