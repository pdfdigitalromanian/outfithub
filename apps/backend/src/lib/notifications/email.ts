import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Sends a transactional email through the Notification Module.
 * - With SendGrid configured, `template` must be a SendGrid dynamic template
 *   ID; set them via SENDGRID_TEMPLATE_* env vars (see .env.example).
 * - Without SendGrid, the local provider logs the email (development).
 */
export async function sendEmail(
  container: MedusaContainer,
  input: { to: string; template: string; data: Record<string, unknown> }
) {
  const notification = container.resolve(Modules.NOTIFICATION)
  await notification.createNotifications({
    to: input.to,
    channel: "email",
    template: input.template,
    data: input.data,
  })
}

export const TEMPLATES = {
  orderPlaced: () => process.env.SENDGRID_TEMPLATE_ORDER_PLACED || "order-placed",
  passwordReset: () => process.env.SENDGRID_TEMPLATE_PASSWORD_RESET || "password-reset",
  shipmentCreated: () => process.env.SENDGRID_TEMPLATE_SHIPMENT || "shipment-created",
}

export function storefrontUrl() {
  return (process.env.STOREFRONT_URL || "http://localhost:3000").replace(/\/$/, "")
}
