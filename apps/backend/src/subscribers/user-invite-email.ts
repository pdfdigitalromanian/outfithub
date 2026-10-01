import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TEMPLATES, adminUrl, sendEmail } from "../lib/notifications/email"

/** Sends the admin invitation link (Medusa Admin /app/invite) when an invite is created or resent. */
export default async function userInviteEmail({ event, container }: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve("logger")
  try {
    const { data: [invite] } = await query.graph({
      entity: "invite",
      fields: ["id", "email", "token", "expires_at"],
      filters: { id: event.data.id },
    })
    if (!invite?.email) return
    await sendEmail(container, {
      to: invite.email,
      template: TEMPLATES.userInvite(),
      data: { url: `${adminUrl()}/invite?token=${encodeURIComponent(invite.token)}`, email: invite.email, expires_at: invite.expires_at },
    })
  } catch (e) {
    logger.error(`[email] admin invite email failed for ${event.data.id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["invite.created", "invite.resent"],
  context: { subscriberId: "outfithub-user-invite-email" },
}
