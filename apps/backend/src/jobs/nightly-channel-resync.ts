import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { enqueueProductSync } from "../lib/channels/sync-engine"

/**
 * Re-queues every published product once a night so price-list changes and
 * anything missed by events converge on all channels.
 */
export default async function nightlyChannelResync(container: MedusaContainer) {
  const productModule = container.resolve(Modules.PRODUCT)
  let skip = 0
  const take = 200
  let total = 0
  for (;;) {
    const products = await productModule.listProducts({ status: "published" }, { select: ["id"], skip, take })
    for (const p of products) {
      await enqueueProductSync(container, p.id, "upsert")
    }
    total += products.length
    if (products.length < take) break
    skip += take
  }
  container.resolve("logger").info(`[channels] nightly resync queued ${total} product(s)`)
}

export const config = {
  name: "outfithub-nightly-channel-resync",
  schedule: "15 3 * * *",
}
