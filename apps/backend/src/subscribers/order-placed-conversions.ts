import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { INTEGRATIONS_MODULE } from "../modules/integrations"
import type IntegrationsModuleService from "../modules/integrations/service"
import { sendPurchaseConversions } from "../lib/tracking/server-conversions"

/**
 * Sends the Purchase event server-side (Meta Conversions API, TikTok Events
 * API, GA4 Measurement Protocol) — only when the shopper granted the matching
 * consent category, which the storefront stores in the cart metadata.
 * Browser pixels use the same event_id (order id) for deduplication.
 */
export default async function orderPlacedConversions({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  try {
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "total",
        "shipping_total",
        "tax_total",
        "metadata",
        "customer_id",
        "shipping_address.phone",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.city",
        "shipping_address.postal_code",
        "shipping_address.country_code",
        "items.variant_id",
        "items.product_id",
        "items.product_title",
        "items.variant_sku",
        "items.quantity",
        "items.unit_price",
      ],
      filters: { id: event.data.id },
    })
    if (!order) return
    const results = await sendPurchaseConversions(svc, order as any)
    for (const r of results) {
      if (r.status === "error") logger.warn(`[tracking] ${r.provider} purchase event failed: ${r.message}`)
    }
  } catch (e) {
    logger.error(`[tracking] purchase conversions failed for ${event.data.id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
  context: { subscriberId: "outfithub-order-placed-conversions" },
}
