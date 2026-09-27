import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { TEMPLATES, sendEmail, storefrontUrl } from "../lib/notifications/email"

/** Sends the customer password reset link (storefront /account/reset-password). */
export default async function passwordReset({
  event,
  container,
}: SubscriberArgs<{ entity_id: string; token: string; actor_type: string }>) {
  const { entity_id: email, token, actor_type } = event.data
  const base = actor_type === "customer" ? `${storefrontUrl()}/account/reset-password` : `${(process.env.MEDUSA_BACKEND_URL || "").replace(/\/$/, "")}/app/reset-password`
  const url = `${base}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  try {
    await sendEmail(container, { to: email, template: TEMPLATES.passwordReset(), data: { url, email } })
  } catch (e) {
    container.resolve("logger").error(`[email] password reset email failed: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
  context: { subscriberId: "outfithub-password-reset" },
}
