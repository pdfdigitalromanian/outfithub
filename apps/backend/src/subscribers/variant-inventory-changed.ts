import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { enqueueProductSync, processProductNow, pushTikTokInventoryAndPrice } from "../lib/channels/sync-engine"

/**
 * Keeps channel stock and prices fresh when variants or inventory levels change.
 */
export default async function variantInventoryChanged({ event, container }: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve("logger")
  let productIds: string[] = []

  try {
    if (event.name.startsWith("product-variant.")) {
      const { data } = await query.graph({
        entity: "product_variant",
        fields: ["product_id"],
        filters: { id: event.data.id },
        withDeleted: true,
      })
      productIds = data.map((v: any) => v.product_id).filter(Boolean)
    } else {
      const { data: levels } = await query.graph({
        entity: "inventory_level",
        fields: ["inventory_item_id"],
        filters: { id: event.data.id },
      })
      const itemIds = levels.map((l: any) => l.inventory_item_id).filter(Boolean)
      if (itemIds.length) {
        const { data: items } = await query.graph({
          entity: "inventory_item",
          fields: ["variants.product_id"],
          filters: { id: itemIds },
        })
        productIds = items.flatMap((i: any) => (i.variants ?? []).map((v: any) => v?.product_id)).filter(Boolean)
      }
    }
  } catch (e) {
    logger.warn(`[channels] could not resolve product for ${event.name} ${event.data.id}: ${(e as Error).message}`)
    return
  }

  for (const productId of [...new Set(productIds)]) {
    await enqueueProductSync(container, productId, "upsert", ["google_merchant", "meta"])
    await processProductNow(container, productId)
    await pushTikTokInventoryAndPrice(container, productId).catch((e) =>
      logger.warn(`[channels] TikTok inventory push failed for ${productId}: ${e.message}`)
    )
  }
}

export const config: SubscriberConfig = {
  event: ["product-variant.created", "product-variant.updated", "product-variant.deleted", "inventory-level.updated", "inventory-level.created"],
  context: { subscriberId: "outfithub-variant-inventory-changed" },
}
