import type { MedusaContainer } from "@medusajs/framework/types"
import { INTEGRATIONS_MODULE } from "../../modules/integrations"
import type IntegrationsModuleService from "../../modules/integrations/service"
import { ProviderError } from "../providers/http"
import { TikTokShopClient, TikTokShopTokens } from "../providers/tiktok-shop"

/** Persists tokens returned by TikTok's token endpoints. Expiries are unix seconds. */
export async function storeTikTokTokens(container: MedusaContainer, tokens: TikTokShopTokens) {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  await svc.storeSecrets("tiktok_shop", {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    access_token_expire_in: tokens.access_token_expire_in,
    refresh_token_expire_in: tokens.refresh_token_expire_in,
  })
  await svc.setConfigValues("tiktok_shop", {
    seller_name: tokens.seller_name ?? null,
    seller_base_region: tokens.seller_base_region ?? null,
  })
}

/** Returns an authenticated client, refreshing the access token when close to expiry. */
export async function getTikTokShopClient(container: MedusaContainer): Promise<TikTokShopClient> {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const integ = await svc.resolveIntegration("tiktok_shop")
  const c = integ.config as Record<string, any>
  const s = integ.secrets as Record<string, any>
  if (!c.app_key || !s.app_secret) {
    throw new ProviderError("tiktok_shop", "not_configured", "TikTok Shop app key / secret are not configured")
  }
  if (!s.access_token) {
    throw new ProviderError("tiktok_shop", "authorization", "Seller authorization required")
  }
  let accessToken = s.access_token as string
  const expiresAt = Number(s.access_token_expire_in ?? 0) * 1000
  if (expiresAt && expiresAt - Date.now() < 3600_000) {
    if (!s.refresh_token || Number(s.refresh_token_expire_in ?? 0) * 1000 < Date.now()) {
      throw new ProviderError("tiktok_shop", "authorization", "TikTok Shop authorization expired; re-authorize the shop")
    }
    const base = new TikTokShopClient({ app_key: c.app_key, app_secret: s.app_secret })
    const tokens = await base.refreshToken(s.refresh_token)
    await storeTikTokTokens(container, tokens)
    accessToken = tokens.access_token
  }
  return new TikTokShopClient({
    app_key: c.app_key,
    app_secret: s.app_secret,
    access_token: accessToken,
    shop_cipher: c.shop_cipher,
  })
}
