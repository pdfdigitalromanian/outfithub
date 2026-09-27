import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INTEGRATIONS_MODULE } from "../../../../../modules/integrations"
import type IntegrationsModuleService from "../../../../../modules/integrations/service"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const logs = await svc.listIntegrationLogs(
    { provider: req.params.provider },
    { take: 50, order: { created_at: "DESC" } }
  )
  res.json({ logs })
}
