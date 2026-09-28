import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { INTEGRATIONS_MODULE } from "../../modules/integrations"
import type IntegrationsModuleService from "../../modules/integrations/service"

/** Resolve the canonical locker record server-side; browser labels are untrusted. */
export async function validateLockerSelection(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  try {
    const body = req.body as { option_id?: string; data?: Record<string, unknown> }
    if (!body?.option_id) return next()
    const fulfillment = req.scope.resolve(Modules.FULFILLMENT)
    const option = await fulfillment.retrieveShippingOption(body.option_id)
    if (option.data?.id !== "sameday-easybox") return next()
    const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
    const integration = await svc.resolveIntegration("sameday")
    if (!integration.enabled || integration.status !== "connected") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Livrarea Easybox nu este disponibilă momentan.")
    }
    const id = String(body.data?.locker_id ?? "")
    if (!/^\d{1,20}$/.test(id)) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Selectează un Easybox valid.")
    const [locker] = await svc.listSamedayLockers({ locker_id: id }, { take: 1 })
    if (!locker) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Acest Easybox nu mai este disponibil. Alege altul.")
    const data = { locker_id: locker.locker_id, locker_name: locker.name, locker_address: locker.address, locker_city: locker.city }
    body.data = data
    // Core routes read validatedBody after Medusa's validation middleware.
    if (req.validatedBody) (req.validatedBody as typeof body).data = data
    next()
  } catch (error) { next(error) }
}
