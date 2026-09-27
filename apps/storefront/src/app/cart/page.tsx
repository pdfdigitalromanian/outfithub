import type { Metadata } from "next"
import { CartPageClient } from "@/components/cart/cart-page"
import { getStoreConfig } from "@/lib/data/content"

export const metadata: Metadata = { title: "Coș de cumpărături", robots: { index: false, follow: true } }

export default async function CartPage() {
  const { content } = await getStoreConfig()
  return <CartPageClient freeShippingThreshold={content.shipping.free_shipping_threshold} />
}
