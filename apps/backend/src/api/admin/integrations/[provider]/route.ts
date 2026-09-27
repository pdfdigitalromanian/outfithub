import { revalidateStorefront } from "../../../../lib/storefront-revalidate"
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INTEGRATIONS_MODULE } from "../../../../modules/integrations"
import type IntegrationsModuleService from "../../../../modules/integrations/service"
import { isIntegrationProvider } from "../../../../lib/integrations/registry"
import { testIntegration } from "../../../../lib/integrations/test-connection"
import type { PostIntegrationBody } from "../../../validators"

function providerParam(req: AuthenticatedMedusaRequest) {
  const { provider } = req.params
  if (!isIntegrationProvider(provider)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Unknown integration ${provider}`)
  }
  return provider
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  res.json({ integration: await svc.describeIntegration(providerParam(req)) })
}

/** Saves configuration and immediately verifies it against the provider. */
export async function POST(req: AuthenticatedMedusaRequest<PostIntegrationBody>, res: MedusaResponse) {
  const provider = providerParam(req)
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  await svc.saveIntegration(provider, req.validatedBody)
  const test = await testIntegration(req.scope, provider)
  void revalidateStorefront(["content"])
  res.json({ integration: await svc.describeIntegration(provider), test })
}
