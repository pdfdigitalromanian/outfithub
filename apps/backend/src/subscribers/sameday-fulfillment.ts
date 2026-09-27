import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { INTEGRATIONS_MODULE } from "../modules/integrations"
import type IntegrationsModuleService from "../modules/integrations/service"
import { cancelShipment, createAwbForFulfillment } from "../lib/shipping/sameday-service"

/**
 * Creates the Sameday AWB when a Sameday fulfillment is created (if enabled in
 * Settings → Integrations → Sameday) and cancels it when the fulfillment is
 * canceled. Errors are stored on the shipment and shown on the order page,
 * where the AWB can be (re)generated manually.
 */
export default async function samedayFulfillment({
  event,
  container,
}: SubscriberArgs<{ order_id: string; fulfillment_id: string }>) {
  const logger = container.resolve("logger")
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const integ = await svc.resolveIntegration("sameday")
  if (!integ.enabled || integ.status === "not_configured") return

  const { order_id, fulfillment_id } = event.data
  try {
    if (event.name === "order.fulfillment_created") {
      if (integ.config.auto_create_awb === false || integ.config.auto_create_awb === "false") return
      await createAwbForFulfillment(container, order_id, fulfillment_id)
    } else {
      const shipments = await svc.listSamedayShipments({ fulfillment_id, status: ["created", "in_transit"] })
      for (const s of shipments) await cancelShipment(container, s.id)
    }
  } catch (e) {
    logger.error(`[sameday] ${event.name} handling failed for order ${order_id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["order.fulfillment_created", "order.fulfillment_canceled"],
  context: { subscriberId: "outfithub-sameday-fulfillment" },
}
