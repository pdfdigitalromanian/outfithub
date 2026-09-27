import "server-only"
import { cache } from "react"
import { sdk } from "../medusa"
import { IS_BUILD } from "../util/resilience"

export type SiteContent = {
  homepage: {
    hero: Record<"eyebrow" | "title" | "subtitle" | "cta_label" | "cta_href" | "secondary_label" | "secondary_href" | "image_url" | "image_alt", string>
    featured_collections: string[]
    featured_title: string
    editorial: Record<"eyebrow" | "title" | "body" | "cta_label" | "cta_href" | "image_url" | "image_alt", string>
    usps: { title: string; body: string }[]
  }
  company: Record<"trade_name" | "legal_name" | "cui" | "reg_com" | "address" | "email" | "phone" | "support_hours", string>
  social: Record<"instagram" | "tiktok" | "facebook" | "pinterest" | "youtube", string>
  seo: Record<
    | "site_name"
    | "title_template"
    | "default_title"
    | "default_description"
    | "default_og_image"
    | "twitter_handle"
    | "product_title_template"
    | "product_description_template",
    string
  >
  announcement: { enabled: boolean; text: string; href: string }
  shipping: { free_shipping_threshold: number; currency_code: string; delivery_estimate: string; returns_days: number }
}

export type TrackingConfig = {
  google_analytics?: { measurement_id?: string | null; gtm_container_id?: string | null; google_ads_id?: string | null }
  meta?: { pixel_id?: string | null }
  tiktok_events?: { pixel_code?: string | null }
}

export type StoreConfig = {
  content: SiteContent
  tracking: TrackingConfig
  pages: { handle: string; title: string; is_legal: boolean }[]
  features: { easybox: boolean }
}

export const FALLBACK_CONFIG: StoreConfig = {
  content: {
    homepage: {
      hero: {
        eyebrow: "Colecția de sezon",
        title: "Haine gândite să fie purtate, nu doar privite.",
        subtitle: "Croieli relaxate, materiale care respiră și o paletă care se potrivește cu tot ce ai deja în dulap.",
        cta_label: "Descoperă colecția",
        cta_href: "/shop",
        secondary_label: "Noutăți",
        secondary_href: "/shop?sort=newest",
        image_url: "",
        image_alt: "",
      },
      featured_collections: [],
      featured_title: "Noutăți în magazin",
      editorial: { eyebrow: "", title: "", body: "", cta_label: "", cta_href: "", image_url: "", image_alt: "" },
      usps: [],
    },
    company: { trade_name: "OutfitHub", legal_name: "", cui: "", reg_com: "", address: "", email: "", phone: "", support_hours: "" },
    social: { instagram: "", tiktok: "", facebook: "", pinterest: "", youtube: "" },
    seo: {
      site_name: "OutfitHub",
      title_template: "%s | OutfitHub",
      default_title: "OutfitHub",
      default_description: "Magazin online de haine și accesorii.",
      default_og_image: "",
      twitter_handle: "",
      product_title_template: "",
      product_description_template: "",
    },
    announcement: { enabled: false, text: "", href: "" },
    shipping: { free_shipping_threshold: 300, currency_code: "ron", delivery_estimate: "1–2 zile lucrătoare", returns_days: 30 },
  },
  tracking: {},
  pages: [],
  features: { easybox: false },
}

/** Editable storefront content from the backend (cached 60s, tag "content"). */
export const getStoreConfig = cache(async (): Promise<StoreConfig> => {
  try {
    return await sdk.client.fetch<StoreConfig>("/store/content", {
      next: { revalidate: 60, tags: ["content"] },
      cache: "force-cache",
    })
  } catch (e) {
    if (IS_BUILD) return FALLBACK_CONFIG
    throw e
  }
})

export type ContentPage = {
  id: string
  handle: string
  title: string
  body: string
  seo_title: string | null
  seo_description: string | null
  is_legal: boolean
  updated_at: string
}

export async function getPage(handle: string): Promise<ContentPage | null> {
  try {
    const { page } = await sdk.client.fetch<{ page: ContentPage }>(`/store/content/pages/${encodeURIComponent(handle)}`, {
      next: { revalidate: 300, tags: ["content", `page-${handle}`] },
      cache: "force-cache",
    })
    return page
  } catch (e: any) {
    if (e?.status === 404 || IS_BUILD) return null
    throw e
  }
}

/** Replaces {{company.x}} / {{shipping.x}} / {{site_url}} tokens in legal pages. */
export function fillTokens(body: string, content: SiteContent, extra: Record<string, string> = {}) {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    if (key in extra) return extra[key]
    const [group, field] = key.split(".")
    const value = (content as any)?.[group]?.[field]
    if (value === undefined || value === null || value === "") return `[${key}]`
    return String(value)
  })
}
