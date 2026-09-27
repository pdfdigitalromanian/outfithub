import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { SEO_MODULE } from "../../../../modules/seo"
import type SeoModuleService from "../../../../modules/seo/service"
import { CONTENT_MODULE } from "../../../../modules/content"
import type ContentModuleService from "../../../../modules/content/service"

/**
 * Everything the storefront needs to render sitemap.xml: published products in
 * the storefront sales channel (with images for image sitemaps), collections,
 * categories and static pages. Resources flagged `noindex` are excluded.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const seo = req.scope.resolve<SeoModuleService>(SEO_MODULE)
  const content = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  const storeModule = req.scope.resolve(Modules.STORE)
  const salesChannelIds: string[] =
    ((req as any).publishable_key_context?.sales_channel_ids as string[] | undefined) ??
    [(await storeModule.listStores())[0]?.default_sales_channel_id].filter(Boolean) as string[]

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "updated_at", "thumbnail", "images.url", "sales_channels.id"],
    filters: { status: "published" },
  })
  const visible = products.filter((p: any) =>
    (p.sales_channels ?? []).some((s: any) => salesChannelIds.includes(s?.id))
  )
  const { data: collections } = await query.graph({ entity: "product_collection", fields: ["id", "handle", "title", "updated_at"] })
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "name", "updated_at"],
    filters: { is_active: true, is_internal: false },
  })
  const pages = await content.listContentPages({ published: true }, { select: ["handle", "updated_at"] })

  const noindex = async (type: "product" | "collection" | "category", ids: string[]) =>
    new Set((await seo.getManyFor(type, ids)).filter((e) => e.noindex).map((e) => e.resource_id))
  const [np, nc, ncat] = await Promise.all([
    noindex("product", visible.map((p: any) => p.id)),
    noindex("collection", collections.map((c: any) => c.id)),
    noindex("category", categories.map((c: any) => c.id)),
  ])

  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
  res.json({
    products: visible
      .filter((p: any) => !np.has(p.id))
      .map((p: any) => ({
        handle: p.handle,
        title: p.title,
        updated_at: p.updated_at,
        images: [...new Set([p.thumbnail, ...(p.images ?? []).map((i: any) => i?.url)].filter(Boolean))].slice(0, 10),
      })),
    collections: collections.filter((c: any) => !nc.has(c.id)).map((c: any) => ({ handle: c.handle, updated_at: c.updated_at })),
    categories: categories.filter((c: any) => !ncat.has(c.id)).map((c: any) => ({ handle: c.handle, updated_at: c.updated_at })),
    pages: pages.map((p) => ({ handle: p.handle, updated_at: p.updated_at })),
  })
}
