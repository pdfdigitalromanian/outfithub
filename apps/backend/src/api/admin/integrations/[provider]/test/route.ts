import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { isIntegrationProvider } from "../../../../../lib/integrations/registry"
import { testIntegration } from "../../../../../lib/integrations/test-connection"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { provider } = req.params
  if (!isIntegrationProvider(provider)) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Unknown integration")
  res.json({ test: await testIntegration(req.scope, provider) })
}
