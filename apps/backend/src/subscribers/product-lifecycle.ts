import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { applyProductSeo } from "../lib/seo/apply"
import { enqueueProductSync, processProductNow } from "../lib/channels/sync-engine"

/**
 * Product publish pipeline:
 *   product saved → SEO generated → channel sync queued → each channel pushed
 * independently. Failures are recorded per channel and retried by the
 * `process-channel-syncs` job; they never affect the product in the store.
 */
export default async function productLifecycle({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const productId = event.data.id

  if (event.name === "product.deleted") {
    await enqueueProductSync(container, productId, "delete")
    await processProductNow(container, productId)
    return
  }

  try {
    await applyProductSeo(container, productId)
  } catch (e) {
    logger.error(`[seo] generation failed for ${productId}: ${(e as Error).message}`)
  }

  try {
    const queued = await enqueueProductSync(container, productId, "upsert")
    if (queued.length) await processProductNow(container, productId)
  } catch (e) {
    logger.error(`[channels] enqueue failed for ${productId}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated", "product.deleted"],
  context: { subscriberId: "outfithub-product-lifecycle" },
}
