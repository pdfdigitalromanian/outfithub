import type { MedusaContainer } from "@medusajs/framework/types"
import { processDueSyncs } from "../lib/channels/sync-engine"

/** Retries pending / failed channel synchronizations whose back-off elapsed. */
export default async function processChannelSyncs(container: MedusaContainer) {
  const results = await processDueSyncs(container, 100)
  if (results.length) {
    container.resolve("logger").info(`[channels] processed ${results.length} channel sync(s)`)
  }
}

export const config = {
  name: "outfithub-process-channel-syncs",
  schedule: "*/5 * * * *",
}
