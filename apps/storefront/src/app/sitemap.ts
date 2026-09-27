import type { MetadataRoute } from "next"
import { getSitemapData } from "@/lib/data/seo"
import { SITE_URL } from "@/lib/env"

export const revalidate = 900

/** Product/collection/category/page sitemap incl. image entries; noindex items excluded by the backend. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData()
  const now = new Date()
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...data.categories.map((c) => ({ url: `${SITE_URL}/categories/${c.handle}`, lastModified: new Date(c.updated_at), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...data.collections.map((c) => ({ url: `${SITE_URL}/collections/${c.handle}`, lastModified: new Date(c.updated_at), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...data.products.map((p) => ({
      url: `${SITE_URL}/products/${p.handle}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: p.images,
    })),
    ...data.pages.map((p) => ({ url: `${SITE_URL}/pages/${p.handle}`, lastModified: new Date(p.updated_at), changeFrequency: "monthly" as const, priority: 0.3 })),
  ]
}
