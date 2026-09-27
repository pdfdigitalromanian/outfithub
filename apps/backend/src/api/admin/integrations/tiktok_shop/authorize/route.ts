import crypto from "crypto"
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INTEGRATIONS_MODULE } from "../../../../../modules/integrations"
import type IntegrationsModuleService from "../../../../../modules/integrations/service"
import { TikTokShopClient } from "../../../../../lib/providers/tiktok-shop"

/**
 * Returns the TikTok Shop seller authorization URL. A random `state` is stored
 * (encrypted) and checked by the public callback route to prevent CSRF.
 * Set the app's Redirect URL in Partner Center to
 * `${MEDUSA_BACKEND_URL}/integrations/tiktok-shop/callback`.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const integ = await svc.resolveIntegration("tiktok_shop")
  const serviceId = integ.config.service_id as string | undefined
  if (!serviceId || !integ.config.app_key || !integ.secrets.app_secret) {
    return res.status(400).json({ message: "Save the app key, app secret and service ID first." })
  }
  const state = crypto.randomBytes(24).toString("hex")
  await svc.storeSecrets("tiktok_shop", { _oauth_state: state, _oauth_state_expires: Date.now() + 15 * 60_000 })
  res.json({
    url: TikTokShopClient.authorizeUrl(serviceId, state),
    redirect_uri: `${(process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")}/integrations/tiktok-shop/callback`,
  })
}
