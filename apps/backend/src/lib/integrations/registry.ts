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
      "Publică produsele în Google Shopping și în listările gratuite prin Merchant API (products v1). Contul de serviciu trebuie adăugat ca utilizator în Merchant Center.",
    docs_url: "https://developers.google.com/merchant/api/guides/quickstart",
    fields: [
      { key: "merchant_id", label: "ID cont Merchant Center", type: "text", required: true, placeholder: "123456789" },
      {
        key: "data_source_id",
        label: "ID sursă de date API",
        type: "text",
        required: true,
        help: "Merchant Center → Settings → Data sources → adaugă o sursă API sau folosește butonul de creare. Introdu ID-ul numeric.",
      },
      { key: "feed_label", label: "Etichetă flux de produse", type: "text", required: true, default: "RO" },
      { key: "content_language", label: "Limba conținutului", type: "text", required: true, default: "ro" },
      { key: "default_brand", label: "Marcă implicită", type: "text", default: "OutfitHub" },
      {
        key: "google_product_category",
        label: "Categorie Google implicită",
        type: "text",
        default: "1604",
        help: "1604 = Îmbrăcăminte și accesorii > Îmbrăcăminte",
      },
      {
        key: "service_account_json",
        label: "Cheie JSON a contului de serviciu",
        type: "textarea",
        required: true,
        secret: true,
        help: "Google Cloud Console → IAM → Service accounts → Keys → Add key (JSON). Activează Merchant API în proiect.",
      },
    ],
  },
  google_analytics: {
    provider: "google_analytics",
    name: "Google Analytics 4 / Tag Manager",
    category: "analytics",
    description:
      "Măsurare GA4 în browser, cu consimțământ prin Consent Mode v2, și evenimente opționale de cumpărare de pe server prin Measurement Protocol.",
    docs_url: "https://developers.google.com/analytics/devguides/collection/protocol/ga4",
    fields: [
      { key: "measurement_id", label: "ID de măsurare GA4", type: "text", required: true, public: true, placeholder: "G-XXXXXXXXXX" },
      { key: "gtm_container_id", label: "ID container Google Tag Manager (opțional)", type: "text", public: true, placeholder: "GTM-XXXXXXX" },
      { key: "google_ads_id", label: "ID etichetă Google Ads (opțional)", type: "text", public: true, placeholder: "AW-XXXXXXXXX" },
      {
        key: "api_secret",
        label: "Secret API Measurement Protocol",
        type: "password",
        secret: true,
        help: "GA4 Admin → Data streams → fluxul tău → Measurement Protocol API secrets.",
      },
    ],
  },
  meta: {
    provider: "meta",
    name: "Meta (Facebook & Instagram)",
    category: "sales_channel",
    description:
      "Meta Pixel și Conversions API, cu sincronizarea catalogului pentru Facebook/Instagram Shops și reclamele Advantage+.",
    docs_url: "https://developers.facebook.com/docs/marketing-api/catalog",
    fields: [
      { key: "pixel_id", label: "ID pixel / set de date", type: "text", required: true, public: true },
      { key: "catalog_id", label: "ID catalog de produse", type: "text", help: "Commerce Manager → Catalog → Settings." },
      { key: "graph_version", label: "Versiune Graph API", type: "text", default: "v24.0" },
      { key: "test_event_code", label: "Cod de eveniment de test (opțional)", type: "text", help: "Events Manager → Test events. Elimină codul în producție." },
      {
        key: "access_token",
        label: "Token de acces al utilizatorului de sistem",
        type: "password",
        required: true,
        secret: true,
        help: "Business Settings → Users → System users → Generate token, cu catalog_management, business_management și ads_management.",
      },
      { key: "app_secret", label: "Secretul aplicației (validarea semnăturii webhook)", type: "password", secret: true },
      { key: "webhook_verify_token", label: "Token de verificare webhook", type: "password", secret: true },
    ],
  },
  tiktok_events: {
    provider: "tiktok_events",
    name: "TikTok Pixel & Events API",
    category: "tracking",
    description: "TikTok Pixel în browser, activat cu consimțământ, și Events API 2.0 pe server pentru atribuirea cumpărărilor.",
    docs_url: "https://business-api.tiktok.com/portal/docs?id=1771100865818625",
    fields: [
      { key: "pixel_code", label: "Cod pixel", type: "text", required: true, public: true },
      { key: "advertiser_id", label: "ID agent de publicitate (pentru verificarea conexiunii)", type: "text" },
      { key: "test_event_code", label: "Cod de eveniment de test (opțional)", type: "text" },
      { key: "access_token", label: "Token de acces Events API", type: "password", required: true, secret: true },
    ],
  },
  tiktok_shop: {
    provider: "tiktok_shop",
    name: "TikTok Shop",
    category: "sales_channel",
    description:
      "TikTok Shop Partner API (versiunile 202309): autorizare OAuth, publicarea produselor și sincronizarea prețurilor și stocurilor. Necesită un cont de vânzător aprobat într-o piață acceptată.",
    docs_url: "https://partner.tiktokshop.com/docv2/page/seller-api-overview",
    oauth: true,
    fields: [
      { key: "app_key", label: "Cheia aplicației", type: "text", required: true },
      { key: "service_id", label: "ID serviciu (link de autorizare)", type: "text", required: true },
      { key: "category_id", label: "ID categorie TikTok implicită", type: "text", help: "Categorie finală din API-ul Get Categories." },
      { key: "warehouse_id", label: "ID depozit", type: "text", help: "Completat automat după autorizare dacă este gol." },
      { key: "brand_id", label: "ID marcă (opțional)", type: "text" },
      { key: "package_weight_kg", label: "Greutate implicită colet (kg)", type: "number", default: 0.5 },
      { key: "app_secret", label: "Secretul aplicației", type: "password", required: true, secret: true },
    ],
  },
  sameday: {
    provider: "sameday",
    name: "Sameday Courier",
    category: "shipping",
    description:
      "Livrare la adresă și Easybox: servicii disponibile, lista lockerelor, generare AWB, etichete PDF, urmărire și anulare prin API-ul Sameday.",
    docs_url: "https://sameday.ro/business/integrare-api/",
    fields: [
      {
        key: "environment",
        label: "Mediu",
        type: "select",
        required: true,
        default: "production",
        options: [
          { value: "production", label: "Producție (api.sameday.ro)" },
          { value: "demo", label: "Test / demo (sameday-api.demo.zitec.com)" },
        ],
      },
      { key: "pickup_point_id", label: "ID punct de ridicare", type: "text", help: "Preluat din API după prima conectare reușită." },
      { key: "contact_person_id", label: "ID persoană de contact la ridicare", type: "text" },
      { key: "service_id_home", label: "ID serviciu – livrare la adresă", type: "text", help: "De obicei, serviciul „24H” / Next day." },
      { key: "service_id_locker", label: "ID serviciu – Easybox", type: "text", help: "De obicei, „Locker NextDay” (LN)." },
      { key: "default_weight_kg", label: "Greutate implicită colet (kg)", type: "number", default: 1 },
      { key: "auto_create_awb", label: "Generează AWB automat la crearea unei expedieri", type: "boolean", default: true },
      { key: "username", label: "Utilizator API", type: "text", required: true, secret: true },
      { key: "password", label: "Parolă API", type: "password", required: true, secret: true },
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
