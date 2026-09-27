import type { MedusaContainer } from "@medusajs/framework/types"
import { INTEGRATIONS_MODULE } from "../../modules/integrations"
import type IntegrationsModuleService from "../../modules/integrations/service"
import { IntegrationProvider, missingRequiredFields } from "./registry"
import { ProviderError, requestJson } from "../providers/http"
import { GoogleMerchantClient } from "../providers/google-merchant"
import { MetaClient } from "../providers/meta"
import { TikTokEventsClient } from "../providers/tiktok-events"
import { getTikTokShopClient } from "../channels/tiktok-shop-auth"
import { getSamedayClient } from "../shipping/sameday-service"

export type TestResult = {
  status: "not_configured" | "authorization_required" | "connected" | "error"
  message: string
  details?: Record<string, unknown>
}

/**
 * Calls a cheap, read-only endpoint of the provider to prove the stored
 * credentials work. The resulting status is persisted and shown in the admin.
 */
export async function testIntegration(container: MedusaContainer, provider: IntegrationProvider): Promise<TestResult> {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const integ = await svc.resolveIntegration(provider)
  const c = integ.config as Record<string, any>
  const s = integ.secrets as Record<string, any>
  const missing = missingRequiredFields(provider, c, s)

  let result: TestResult
  if (missing.length) {
    result = { status: "not_configured", message: `Missing: ${missing.join(", ")}` }
  } else {
    try {
      result = await runTest(container, provider, c, s)
    } catch (e) {
      const err = e instanceof ProviderError ? e : new ProviderError(provider, "server", (e as Error).message)
      result = { status: err.connectionStatus, message: err.message }
    }
  }
  await svc.setStatus(provider, result.status, result.message)
  await svc.log(provider, result.status === "connected" ? "info" : "warn", `Connection test: ${result.status} – ${result.message}`)
  return result
}

async function runTest(
  container: MedusaContainer,
  provider: IntegrationProvider,
  c: Record<string, any>,
  s: Record<string, any>
): Promise<TestResult> {
  switch (provider) {
    case "google_merchant": {
      const client = new GoogleMerchantClient({
        merchant_id: c.merchant_id,
        data_source_id: c.data_source_id,
        service_account_json: s.service_account_json,
      })
      const account = await client.getAccount()
      const sources = await client.listDataSources()
      const ds = sources.dataSources?.find((d) => String(d.dataSourceId) === String(c.data_source_id))
      if (!ds) {
        return {
          status: "error",
          message: `Connected to “${account.accountName}”, but data source ${c.data_source_id} was not found. Use “Create API data source”.`,
          details: { data_sources: sources.dataSources ?? [] },
        }
      }
      return { status: "connected", message: `Connected to “${account.accountName}” – data source “${ds.displayName}”.` }
    }
    case "google_analytics": {
      if (!/^G-[A-Z0-9]+$/.test(String(c.measurement_id))) {
        return { status: "error", message: "Measurement ID must look like G-XXXXXXXXXX" }
      }
      if (!s.api_secret) {
        return {
          status: "connected",
          message: "Browser tag configured. Add a Measurement Protocol API secret to also send server-side purchases.",
        }
      }
      const url = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${encodeURIComponent(c.measurement_id)}&api_secret=${encodeURIComponent(s.api_secret)}`
      const res = await requestJson<{ validationMessages?: Array<{ description: string }> }>("google_analytics", url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: "outfithub.connection-test", events: [{ name: "connection_test", params: {} }] }),
      })
      if (res.validationMessages?.length) {
        return { status: "error", message: res.validationMessages.map((m) => m.description).join("; ") }
      }
      return {
        status: "connected",
        message: "Measurement Protocol payload validated. Google does not verify API secrets via the debug endpoint; confirm events in GA4 Realtime.",
      }
    }
    case "meta": {
      const client = new MetaClient({
        access_token: s.access_token,
        pixel_id: c.pixel_id,
        catalog_id: c.catalog_id,
        graph_version: c.graph_version,
      })
      const pixel = await client.getPixel()
      const parts = [`Pixel “${pixel.name}”`]
      if (c.catalog_id) {
        const catalog = await client.getCatalog()
        parts.push(`catalog “${catalog.name}” (${catalog.product_count ?? 0} items)`)
      } else {
        parts.push("no catalog configured (catalog sync disabled)")
      }
      return { status: "connected", message: parts.join(", ") }
    }
    case "tiktok_events": {
      const client = new TikTokEventsClient({
        access_token: s.access_token,
        pixel_code: c.pixel_code,
        advertiser_id: c.advertiser_id,
      })
      const data = await client.listPixels()
      const pixel = data.pixels?.find((p) => p.pixel_code === c.pixel_code)
      if (!pixel) return { status: "error", message: `Pixel ${c.pixel_code} not found for advertiser ${c.advertiser_id}` }
      return { status: "connected", message: `Pixel “${pixel.pixel_name}” reachable.` }
    }
    case "tiktok_shop": {
      if (!s.access_token) {
        return { status: "authorization_required", message: "Authorize your TikTok Shop seller account." }
      }
      const client = await getTikTokShopClient(container)
      const shops = await client.getAuthorizedShops()
      const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
      const shop = shops.shops?.[0]
      if (!shop) return { status: "authorization_required", message: "No shop is authorized for this app." }
      await svc.setConfigValues("tiktok_shop", { shop_cipher: shop.cipher, shop_id: shop.id, shop_name: shop.name, shop_region: shop.region })
      if (!c.warehouse_id) {
        const authed = await getTikTokShopClient(container)
        const wh = await authed.getWarehouses().catch(() => null)
        const def = wh?.warehouses?.find((w) => w.is_default) ?? wh?.warehouses?.[0]
        if (def) await svc.setConfigValues("tiktok_shop", { warehouse_id: def.id })
      }
      return { status: "connected", message: `Shop “${shop.name}” (${shop.region}) authorized.` }
    }
    case "sameday": {
      const client = await getSamedayClient(container)
      const [services, pickupPoints] = await Promise.all([client.getServices(), client.getPickupPoints()])
      const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
      const defaultPp = pickupPoints.find((p) => p.defaultPickupPoint) ?? pickupPoints[0]
      const patch: Record<string, unknown> = {}
      if (!c.pickup_point_id && defaultPp) patch.pickup_point_id = String(defaultPp.id)
      if (!c.contact_person_id && defaultPp?.pickupPointContactPerson?.length) {
        const cp = defaultPp.pickupPointContactPerson.find((p) => p.defaultContactPerson) ?? defaultPp.pickupPointContactPerson[0]
        patch.contact_person_id = String(cp.id)
      }
      if (!c.service_id_home) {
        const home = services.find((sv) => /^24$|^7S$|^1D$/i.test(sv.serviceCode)) ?? services.find((sv) => /24/.test(sv.name))
        if (home) patch.service_id_home = String(home.id)
      }
      if (!c.service_id_locker) {
        const locker = services.find((sv) => /^LN$|^LS$/i.test(sv.serviceCode)) ?? services.find((sv) => /locker|easybox/i.test(sv.name))
        if (locker) patch.service_id_locker = String(locker.id)
      }
      if (Object.keys(patch).length) await svc.setConfigValues("sameday", patch)
      return {
        status: "connected",
        message: `Authenticated. ${services.length} services, ${pickupPoints.length} pickup point(s) available.`,
        details: {
          services: services.map((sv) => ({ id: sv.id, name: sv.name, code: sv.serviceCode })),
          pickup_points: pickupPoints.map((p) => ({
            id: p.id,
            alias: p.alias,
            address: p.address,
            contact_persons: p.pickupPointContactPerson?.map((cp) => ({ id: cp.id, name: cp.name })) ?? [],
          })),
          auto_filled: patch,
        },
      }
    }
  }
}
