import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { applyCategorySeo, applyCollectionSeo } from "../lib/seo/apply"

export default async function listingSeo({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  try {
    if (event.name.startsWith("product-collection.")) await applyCollectionSeo(container, event.data.id)
    else await applyCategorySeo(container, event.data.id)
  } catch (e) {
    logger.error(`[seo] listing generation failed for ${event.data.id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["product-collection.created", "product-collection.updated", "product-category.created", "product-category.updated"],
  context: { subscriberId: "outfithub-listing-seo" },
}
