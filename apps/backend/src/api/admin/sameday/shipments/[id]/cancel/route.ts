import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cancelShipment } from "../../../../../../lib/shipping/sameday-service"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    res.json({ shipment: await cancelShipment(req.scope, req.params.id) })
  } catch (e) {
    res.status(502).json({ message: (e as Error).message })
  }
}
