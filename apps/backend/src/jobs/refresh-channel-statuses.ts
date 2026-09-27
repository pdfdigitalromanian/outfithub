import type { MedusaContainer } from "@medusajs/framework/types"
import { refreshChannelStatuses } from "../lib/channels/status-refresh"

export default async function refreshChannelStatusesJob(container: MedusaContainer) {
  await refreshChannelStatuses(container)
}

export const config = {
  name: "outfithub-refresh-channel-statuses",
  schedule: "20 * * * *",
}
