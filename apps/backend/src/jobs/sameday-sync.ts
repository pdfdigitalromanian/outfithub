import type { MedusaContainer } from "@medusajs/framework/types"
import { INTEGRATIONS_MODULE } from "../modules/integrations"
import type IntegrationsModuleService from "../modules/integrations/service"
import { refreshShipmentStatus, syncSamedayLockers } from "../lib/shipping/sameday-service"

/**
 * Every 30 minutes: refresh tracking of open AWBs. Once a day (first run after
 * 04:00) also refresh the Easybox locker list.
 */
export default async function samedaySync(container: MedusaContainer) {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const logger = container.resolve("logger")
  const integ = await svc.resolveIntegration("sameday")
  if (!integ.enabled || integ.status !== "connected") return

  const open = await svc.listSamedayShipments({ status: ["created", "in_transit"] }, { take: 200 })
  for (const s of open) {
    await refreshShipmentStatus(container, s.id).catch((e) =>
      logger.warn(`[sameday] status refresh failed for ${s.awb_number}: ${e.message}`)
    )
  }

  const [anyLocker] = await svc.listSamedayLockers({}, { take: 1, order: { updated_at: "DESC" } })
  const stale = !anyLocker || Date.now() - new Date(anyLocker.updated_at).getTime() > 20 * 3600_000
  if (stale) {
    await syncSamedayLockers(container).catch((e) => logger.warn(`[sameday] locker sync failed: ${e.message}`))
  }
}

export const config = {
  name: "outfithub-sameday-sync",
  schedule: "*/30 * * * *",
}
