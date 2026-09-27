import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INTEGRATIONS_MODULE } from "../../../../modules/integrations"
import type IntegrationsModuleService from "../../../../modules/integrations/service"
import { CHANNEL_PROVIDERS } from "../../../../lib/integrations/registry"

const STATUSES = ["pending", "processing", "synced", "error", "skipped", "removed"] as const

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const summary: Record<string, unknown> = {}
  for (const provider of CHANNEL_PROVIDERS) {
    const integration = await svc.describeIntegration(provider)
    const counts: Record<string, number> = {}
    for (const status of STATUSES) {
      const [, count] = await svc.listAndCountChannelSyncs({ provider, status }, { take: 1 })
      counts[status] = count
    }
    const [last] = await svc.listChannelSyncs({ provider, status: "synced" }, { take: 1, order: { last_synced_at: "DESC" } })
    summary[provider] = {
      name: integration.name,
      enabled: integration.enabled,
      status: integration.status,
      status_message: integration.status_message,
      counts,
      last_synced_at: last?.last_synced_at ?? null,
    }
  }
  res.json({ summary })
}
