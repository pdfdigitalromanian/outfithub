import { revalidateStorefront } from "../../../../lib/storefront-revalidate"
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"
import type ContentModuleService from "../../../../modules/content/service"
import type { PostContentPageBody } from "../../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  res.json({ pages: await svc.listContentPages({}, { order: { title: "ASC" } }) })
}

export async function POST(req: AuthenticatedMedusaRequest<PostContentPageBody>, res: MedusaResponse) {
  const svc = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  const page = await svc.createContentPages(req.validatedBody)
  void revalidateStorefront(["content"])
  res.json({ page })
}
