import type IntegrationsModuleService from "../../modules/integrations/service"
import { MetaClient, sha256 } from "../providers/meta"
import { TikTokEventsClient } from "../providers/tiktok-events"
import { requestJson } from "../providers/http"

export type ConversionOrder = {
  id: string
  display_id: number
  email?: string | null
  currency_code: string
  total: number
  shipping_total?: number
  tax_total?: number
  customer_id?: string | null
  metadata?: Record<string, any> | null
  shipping_address?: {
    phone?: string | null
    first_name?: string | null
    last_name?: string | null
    city?: string | null
    postal_code?: string | null
    country_code?: string | null
  } | null
  items?: Array<{
    variant_id?: string | null
    product_id?: string | null
    product_title?: string | null
    variant_sku?: string | null
    quantity: number
    unit_price: number
  }>
}

type Result = { provider: string; status: "sent" | "skipped" | "error"; message?: string }

const normPhone = (p?: string | null) => {
  if (!p) return undefined
  let d = p.replace(/\D/g, "")
  if (d.startsWith("0")) d = "40" + d.slice(1)
  return d || undefined
}

/** Consent recorded by the storefront cookie banner at checkout time. */
export function consentFrom(metadata: Record<string, any> | null | undefined) {
  const t = metadata?.tracking ?? {}
  return {
    analytics: t?.consent?.analytics === true,
    marketing: t?.consent?.marketing === true,
    tracking: t as Record<string, any>,
  }
}

export async function sendPurchaseConversions(svc: IntegrationsModuleService, order: ConversionOrder): Promise<Result[]> {
  const { analytics, marketing, tracking } = consentFrom(order.metadata)
  const results: Result[] = []
  const eventId = order.id
  const eventTime = Math.floor(Date.now() / 1000)
  const value = Number(order.total)
  const currency = order.currency_code.toUpperCase()
  const items = order.items ?? []
  const addr = order.shipping_address ?? {}

  // Meta Conversions API
  const meta = await svc.resolveIntegration("meta")
  if (!meta.enabled || !meta.secrets.access_token) results.push({ provider: "meta", status: "skipped", message: "not configured" })
  else if (!marketing) results.push({ provider: "meta", status: "skipped", message: "no marketing consent" })
  else {
    try {
      const client = new MetaClient({
        access_token: String(meta.secrets.access_token),
        pixel_id: String(meta.config.pixel_id),
        graph_version: meta.config.graph_version as string,
        test_event_code: (meta.config.test_event_code as string) || undefined,
      })
      await client.sendEvents([
        {
          event_name: "Purchase",
          event_time: eventTime,
          event_id: eventId,
          action_source: "website",
          event_source_url: tracking.page_url,
          user_data: {
            em: order.email ? [sha256(order.email)] : undefined,
            ph: normPhone(addr.phone) ? [sha256(normPhone(addr.phone)!)] : undefined,
            fn: addr.first_name ? [sha256(addr.first_name)] : undefined,
            ln: addr.last_name ? [sha256(addr.last_name)] : undefined,
            ct: addr.city ? [sha256(addr.city.replace(/\s/g, ""))] : undefined,
            zp: addr.postal_code ? [sha256(addr.postal_code)] : undefined,
            country: addr.country_code ? [sha256(addr.country_code)] : undefined,
            external_id: order.customer_id ? [sha256(order.customer_id)] : undefined,
            client_ip_address: tracking.ip,
            client_user_agent: tracking.user_agent,
            fbp: tracking.fbp,
            fbc: tracking.fbc,
          },
          custom_data: {
            currency,
            value,
            order_id: String(order.display_id),
            content_type: "product",
            contents: items.map((i) => ({ id: i.variant_sku || i.variant_id, quantity: i.quantity, item_price: Number(i.unit_price) })),
            num_items: items.reduce((s, i) => s + i.quantity, 0),
          },
        },
      ])
      results.push({ provider: "meta", status: "sent" })
    } catch (e) {
      results.push({ provider: "meta", status: "error", message: (e as Error).message })
    }
  }

  // TikTok Events API
  const tt = await svc.resolveIntegration("tiktok_events")
  if (!tt.enabled || !tt.secrets.access_token) results.push({ provider: "tiktok_events", status: "skipped", message: "not configured" })
  else if (!marketing) results.push({ provider: "tiktok_events", status: "skipped", message: "no marketing consent" })
  else {
    try {
      const client = new TikTokEventsClient({
        access_token: String(tt.secrets.access_token),
        pixel_code: String(tt.config.pixel_code),
        test_event_code: (tt.config.test_event_code as string) || undefined,
      })
      await client.track([
        {
          event: "CompletePayment",
          event_time: eventTime,
          event_id: eventId,
          user: {
            email: order.email ? sha256(order.email) : undefined,
            phone: normPhone(addr.phone) ? sha256(`+${normPhone(addr.phone)}`) : undefined,
            external_id: order.customer_id ? sha256(order.customer_id) : undefined,
            ip: tracking.ip,
            user_agent: tracking.user_agent,
            ttp: tracking.ttp,
            ttclid: tracking.ttclid,
          },
          properties: {
            currency,
            value,
            order_id: String(order.display_id),
            content_type: "product",
            contents: items.map((i) => ({
              content_id: i.variant_sku || i.variant_id,
              content_name: i.product_title,
              quantity: i.quantity,
              price: Number(i.unit_price),
            })),
          },
          page: { url: tracking.page_url },
        },
      ])
      results.push({ provider: "tiktok_events", status: "sent" })
    } catch (e) {
      results.push({ provider: "tiktok_events", status: "error", message: (e as Error).message })
    }
  }

  // GA4 Measurement Protocol
  const ga = await svc.resolveIntegration("google_analytics")
  if (!ga.enabled || !ga.secrets.api_secret || !ga.config.measurement_id)
    results.push({ provider: "google_analytics", status: "skipped", message: "not configured" })
  else if (!analytics || !tracking.ga_client_id)
    results.push({ provider: "google_analytics", status: "skipped", message: "no analytics consent / client id" })
  else {
    try {
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(String(ga.config.measurement_id))}&api_secret=${encodeURIComponent(String(ga.secrets.api_secret))}`
      await requestJson("google_analytics", url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: tracking.ga_client_id,
          ...(order.customer_id ? { user_id: order.customer_id } : {}),
          events: [
            {
              name: "purchase",
              params: {
                transaction_id: String(order.display_id),
                currency,
                value,
                shipping: Number(order.shipping_total ?? 0),
                tax: Number(order.tax_total ?? 0),
                items: items.map((i) => ({
                  item_id: i.variant_sku || i.variant_id,
                  item_name: i.product_title,
                  price: Number(i.unit_price),
                  quantity: i.quantity,
                })),
              },
            },
          ],
        }),
      })
      results.push({ provider: "google_analytics", status: "sent" })
    } catch (e) {
      results.push({ provider: "google_analytics", status: "error", message: (e as Error).message })
    }
  }

  for (const r of results.filter((r) => r.status !== "skipped")) {
    await svc.log(r.provider, r.status === "sent" ? "info" : "error", `Purchase event for order #${order.display_id}: ${r.status}${r.message ? ` – ${r.message}` : ""}`)
  }
  return results
}
