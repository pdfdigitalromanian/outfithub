"use client"

import { useEffect, useState } from "react"
import type { ProductCardData } from "@/lib/catalog"
import { getRecentlyViewed } from "@/lib/client/storage"
import { readConsent } from "@/lib/client/consent"
import { ProductCard } from "./product-card"

/**
 * Recently viewed products (preferences consent category). IDs live in
 * localStorage; card data is fetched from the cached /api/products route.
 */
export function RecentlyViewed({ excludeId, title = "Vizualizate recent" }: { excludeId?: string; title?: string }) {
  const [items, setItems] = useState<ProductCardData[]>([])
  useEffect(() => {
    if (!readConsent()?.preferences) return
    const ids = getRecentlyViewed().filter((id) => id !== excludeId).slice(0, 4)
    if (!ids.length) return
    fetch(`/api/products?ids=${ids.map(encodeURIComponent).join(",")}`)
      .then((r) => r.json())
      .then((d) => setItems(d.products ?? []))
      .catch(() => undefined)
  }, [excludeId])
  if (!items.length) return null
  return (
    <section className="container-page mt-20" aria-labelledby="recent-title">
      <h2 id="recent-title" className="display mb-6 text-4xl">
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-4">
        {items.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  )
}
