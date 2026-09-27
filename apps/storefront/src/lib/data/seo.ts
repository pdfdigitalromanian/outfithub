import "server-only"
import { sdk } from "../medusa"
import { IS_BUILD } from "../util/resilience"

export type SeoData = {
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
  canonical_path: string | null
  image_alts: Record<string, string>
  noindex: boolean
}

export async function getSeo(type: "product" | "collection" | "category", handle: string): Promise<SeoData | null> {
  try {
    const { seo } = await sdk.client.fetch<{ seo: SeoData | null }>(`/store/seo/${type}/${encodeURIComponent(handle)}`, {
      next: { revalidate: 300, tags: ["seo", `seo-${type}-${handle}`] },
      cache: "force-cache",
    })
    return seo
  } catch {
    return null
  }
}

export type SitemapData = {
  products: { handle: string; title: string; updated_at: string; images: string[] }[]
  collections: { handle: string; updated_at: string }[]
  categories: { handle: string; updated_at: string }[]
  pages: { handle: string; updated_at: string }[]
}

export async function getSitemapData(): Promise<SitemapData> {
  try {
    return await sdk.client.fetch<SitemapData>("/store/seo/sitemap", {
      next: { revalidate: 900, tags: ["products", "sitemap"] },
      cache: "force-cache",
    })
  } catch (e) {
    if (IS_BUILD) return { products: [], collections: [], categories: [], pages: [] }
    throw e
  }
}
