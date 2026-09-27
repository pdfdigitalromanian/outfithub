import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INTEGRATIONS_MODULE } from "../../../../modules/integrations"
import type IntegrationsModuleService from "../../../../modules/integrations/service"
import { createAwbForFulfillment } from "../../../../lib/shipping/sameday-service"
import type { PostSamedayShipmentBody } from "../../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const filters: Record<string, unknown> = {}
  if (req.query.order_id) filters.order_id = String(req.query.order_id)
  const shipments = await svc.listSamedayShipments(filters, { take: 100, order: { created_at: "DESC" } })
  res.json({ shipments })
}

/** Manually (re)generates the AWB for a Sameday fulfillment. */
export async function POST(req: AuthenticatedMedusaRequest<PostSamedayShipmentBody>, res: MedusaResponse) {
  try {
    const shipment = await createAwbForFulfillment(req.scope, req.validatedBody.order_id, req.validatedBody.fulfillment_id)
    if (!shipment) return res.status(400).json({ message: "This fulfillment does not use a Sameday shipping option." })
    res.json({ shipment })
  } catch (e) {
    res.status(502).json({ message: (e as Error).message })
  }
}
