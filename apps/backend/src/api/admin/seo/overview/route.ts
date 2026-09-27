import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { SEO_MODULE } from "../../../../modules/seo"
import type SeoModuleService from "../../../../modules/seo/service"
import { applyProductSeo } from "../../../../lib/seo/apply"

/** Products with SEO issues (missing description, images, GTIN…). */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const seo = req.scope.resolve<SeoModuleService>(SEO_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const entries = await seo.listSeoEntries({ resource_type: "product" }, { take: 2000 })
  const products = entries.length
    ? await productModule.listProducts({ id: entries.map((e) => e.resource_id) }, { select: ["id", "title", "handle", "status", "thumbnail"] })
    : []
  const byId = new Map(products.map((p) => [p.id, p]))
  const [, total] = await productModule.listAndCountProducts({}, { take: 1 })
  res.json({
    total_products: total,
    with_seo: entries.length,
    entries: entries
      .filter((e) => byId.has(e.resource_id))
      .map((e) => ({
        id: e.id,
        product: byId.get(e.resource_id),
        meta_title: e.meta_title,
        meta_description: e.meta_description,
        issues: e.issues ?? [],
        manual_fields: e.manual_fields ?? [],
        noindex: e.noindex,
        generated_at: e.generated_at,
      })),
  })
}

/** Regenerates SEO for all products (respecting manual overrides). */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const products = await productModule.listProducts({}, { select: ["id"], take: 10000 })
  for (const p of products) await applyProductSeo(req.scope, p.id)
  res.json({ regenerated: products.length })
}
