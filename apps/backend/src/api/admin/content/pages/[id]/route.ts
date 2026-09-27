import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../../modules/content"
import type ContentModuleService from "../../../../../modules/content/service"
import type { PostContentPageBody } from "../../../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  res.json({ page: await svc.retrieveContentPage(req.params.id) })
}

export async function POST(req: AuthenticatedMedusaRequest<PostContentPageBody>, res: MedusaResponse) {
  const svc = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  const page = await svc.updateContentPages({ id: req.params.id, ...req.validatedBody })
  res.json({ page })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  await svc.deleteContentPages(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
