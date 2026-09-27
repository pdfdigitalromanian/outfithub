import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncSamedayLockers } from "../../../../../lib/shipping/sameday-service"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    res.json({ result: await syncSamedayLockers(req.scope) })
  } catch (e) {
    res.status(502).json({ message: (e as Error).message })
  }
}
