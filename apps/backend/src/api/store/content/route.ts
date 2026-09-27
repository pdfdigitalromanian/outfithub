import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../modules/content"
import type ContentModuleService from "../../../modules/content/service"
import { INTEGRATIONS_MODULE } from "../../../modules/integrations"
import type IntegrationsModuleService from "../../../modules/integrations/service"

/**
 * Public storefront configuration: editable content plus the public (non-secret)
 * tracking identifiers of enabled integrations. Never contains secrets.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const content = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  const integrations = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const [values, tracking, pages] = await Promise.all([
    content.getAll(),
    integrations.publicConfig(),
    content.listContentPages({ published: true }, { select: ["handle", "title", "is_legal"], order: { title: "ASC" } }),
  ])
  const sameday = await integrations.resolveIntegration("sameday")
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600")
  res.json({
    content: values,
    tracking,
    pages,
    features: {
      easybox: sameday.enabled && sameday.status === "connected" && !!sameday.config.service_id_locker,
    },
  })
}
