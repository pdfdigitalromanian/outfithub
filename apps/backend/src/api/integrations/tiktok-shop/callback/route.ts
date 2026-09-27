import crypto from "crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INTEGRATIONS_MODULE } from "../../../../modules/integrations"
import type IntegrationsModuleService from "../../../../modules/integrations/service"
import { TikTokShopClient } from "../../../../lib/providers/tiktok-shop"
import { storeTikTokTokens } from "../../../../lib/channels/tiktok-shop-auth"
import { testIntegration } from "../../../../lib/integrations/test-connection"

/** Public OAuth redirect target for TikTok Shop seller authorization. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const code = String(req.query.code ?? "")
  const state = String(req.query.state ?? "")
  const adminUrl = `${(process.env.MEDUSA_BACKEND_URL || "").replace(/\/$/, "")}/app/integrations`
  const integ = await svc.resolveIntegration("tiktok_shop")
  const expected = String(integ.secrets._oauth_state ?? "")
  const valid =
    !!code &&
    expected.length === state.length &&
    expected.length > 0 &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(state)) &&
    Number(integ.secrets._oauth_state_expires ?? 0) > Date.now()
  if (!valid) {
    await svc.log("tiktok_shop", "warn", "Rejected OAuth callback (invalid or expired state)")
    return res.redirect(`${adminUrl}?tiktok=invalid_state`)
  }
  try {
    const client = new TikTokShopClient({
      app_key: String(integ.config.app_key),
      app_secret: String(integ.secrets.app_secret),
    })
    const tokens = await client.exchangeAuthCode(code)
    await storeTikTokTokens(req.scope, tokens)
    await svc.storeSecrets("tiktok_shop", { _oauth_state: null, _oauth_state_expires: null })
    await testIntegration(req.scope, "tiktok_shop")
    res.redirect(`${adminUrl}?tiktok=connected`)
  } catch (e) {
    await svc.setStatus("tiktok_shop", "error", (e as Error).message)
    res.redirect(`${adminUrl}?tiktok=error`)
  }
}
