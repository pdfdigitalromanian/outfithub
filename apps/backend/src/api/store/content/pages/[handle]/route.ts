import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CONTENT_MODULE } from "../../../../../modules/content"
import type ContentModuleService from "../../../../../modules/content/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const content = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  const [page] = await content.listContentPages({ handle: req.params.handle, published: true })
  if (!page) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Page not found")
  res.json({ page })
}
