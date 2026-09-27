import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INTEGRATIONS_MODULE } from "../../../../../../modules/integrations"
import type IntegrationsModuleService from "../../../../../../modules/integrations/service"
import { getSamedayClient } from "../../../../../../lib/shipping/sameday-service"

/** Streams the AWB label PDF (A6 by default, `?format=A4` supported). */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const shipment = await svc.retrieveSamedayShipment(req.params.id)
  if (!shipment.awb_number) return res.status(404).json({ message: "No AWB generated yet" })
  try {
    const client = await getSamedayClient(req.scope)
    const pdf = await client.downloadLabel(shipment.awb_number, req.query.format === "A4" ? "A4" : "A6")
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `inline; filename="awb-${shipment.awb_number}.pdf"`)
    res.send(pdf)
  } catch (e) {
    res.status(502).json({ message: (e as Error).message })
  }
}
