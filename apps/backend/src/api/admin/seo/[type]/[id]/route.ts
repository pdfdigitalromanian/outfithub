import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { SEO_MODULE } from "../../../../../modules/seo"
import type SeoModuleService from "../../../../../modules/seo/service"
import type { SeoResourceType } from "../../../../../modules/seo/service"
import type { PostSeoBody } from "../../../../validators"

const TYPES = ["product", "collection", "category"]

function typeParam(t: string): SeoResourceType {
  if (!TYPES.includes(t)) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Unknown resource type")
  return t as SeoResourceType
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const seo = req.scope.resolve<SeoModuleService>(SEO_MODULE)
  res.json({ seo: await seo.getFor(typeParam(req.params.type), req.params.id) })
}

/** Manual overrides. Empty values revert a field to automatic generation. */
export async function POST(req: AuthenticatedMedusaRequest<PostSeoBody>, res: MedusaResponse) {
  const seo = req.scope.resolve<SeoModuleService>(SEO_MODULE)
  await seo.applyManual(typeParam(req.params.type), req.params.id, req.validatedBody)
  res.json({ seo: await seo.getFor(typeParam(req.params.type), req.params.id) })
}
