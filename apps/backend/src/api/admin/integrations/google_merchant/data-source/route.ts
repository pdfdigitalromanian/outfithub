import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INTEGRATIONS_MODULE } from "../../../../../modules/integrations"
import type IntegrationsModuleService from "../../../../../modules/integrations/service"
import { GoogleMerchantClient } from "../../../../../lib/providers/google-merchant"
import { ProviderError } from "../../../../../lib/providers/http"

/** Creates a primary API product data source in Merchant Center and stores its ID. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const integ = await svc.resolveIntegration("google_merchant")
  const c = integ.config as Record<string, any>
  try {
    const client = new GoogleMerchantClient({
      merchant_id: c.merchant_id,
      data_source_id: c.data_source_id,
      service_account_json: integ.secrets.service_account_json,
    })
    const ds = await client.createApiDataSource("OutfitHub API", c.feed_label || "RO", c.content_language || "ro", [
      String(c.feed_label || "RO").toUpperCase(),
    ])
    await svc.setConfigValues("google_merchant", { data_source_id: String(ds.dataSourceId) })
    res.json({ data_source: ds })
  } catch (e) {
    const err = e as ProviderError
    res.status(err.status && err.status < 500 ? 400 : 502).json({ message: err.message })
  }
}
