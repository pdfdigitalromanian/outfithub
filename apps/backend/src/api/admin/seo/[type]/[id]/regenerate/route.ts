import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SEO_MODULE } from "../../../../../../modules/seo"
import type SeoModuleService from "../../../../../../modules/seo/service"
import { applyCategorySeo, applyCollectionSeo, applyProductSeo } from "../../../../../../lib/seo/apply"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { type, id } = req.params
  if (type === "product") await applyProductSeo(req.scope, id)
  else if (type === "collection") await applyCollectionSeo(req.scope, id)
  else await applyCategorySeo(req.scope, id)
  const seo = req.scope.resolve<SeoModuleService>(SEO_MODULE)
  res.json({ seo: await seo.getFor(type as any, id) })
}
