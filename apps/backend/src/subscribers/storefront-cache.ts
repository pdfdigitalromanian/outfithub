import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { revalidateStorefront } from "../lib/storefront-revalidate"

/** Purges storefront catalog caches when catalog data changes. */
export default async function storefrontCache({ event }: SubscriberArgs<{ id: string }>) {
  const tags = ["products", "sitemap", "seo"]
  if (event.name.startsWith("product-collection")) tags.push("collections")
  if (event.name.startsWith("product-category")) tags.push("categories")
  await revalidateStorefront(tags)
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.updated",
    "inventory-level.updated",
    "product-collection.created",
    "product-collection.updated",
    "product-collection.deleted",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
  ],
  context: { subscriberId: "outfithub-storefront-cache" },
}
