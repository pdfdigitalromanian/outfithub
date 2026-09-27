import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TEMPLATES, sendEmail, storefrontUrl } from "../lib/notifications/email"

export default async function orderPlacedEmail({ event, container }: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve("logger")
  try {
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email", "currency_code", "total", "shipping_total", "tax_total", "items.*", "shipping_address.*", "shipping_methods.name", "shipping_methods.data"],
      filters: { id: event.data.id },
    })
    if (!order?.email) return
    await sendEmail(container, {
      to: order.email,
      template: TEMPLATES.orderPlaced(),
      data: { order, order_url: `${storefrontUrl()}/order/${order.id}/confirmed` },
    })
  } catch (e) {
    logger.error(`[email] order confirmation failed for ${event.data.id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
  context: { subscriberId: "outfithub-order-placed-email" },
}
