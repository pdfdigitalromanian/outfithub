"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Heart } from "lucide-react"
import type { ProductCardData } from "@/lib/catalog"
import { useWishlist } from "../providers"
import { ProductGrid, ProductGridSkeleton } from "./product-card"
import { ButtonLink } from "../ui/button"

export function WishlistView() {
  const { ids, ready } = useWishlist()
  const [products, setProducts] = useState<ProductCardData[] | null>(null)

  useEffect(() => {
    if (!ready || !ids.length) return
    fetch(`/api/products?ids=${ids.map(encodeURIComponent).join(",")}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
  }, [ids, ready])

  const empty = ready && !ids.length
  if (!empty && products === null) return <ProductGridSkeleton count={4} />
  if (empty || !products?.length) {
    return (
      <div className="flex flex-col items-center rounded-xl bg-paper-2 px-6 py-20 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-surface">
          <Heart className="h-6 w-6" />
        </span>
        <p className="display mt-5 text-4xl">Nimic salvat încă</p>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Apasă pe inimă la orice produs ca să-l găsești aici. <Link href="/account/login?next=/wishlist" className="underline underline-offset-2">Autentifică-te</Link> ca să le sincronizezi pe toate dispozitivele.
        </p>
        <ButtonLink href="/shop" className="mt-6">
          Descoperă produsele
        </ButtonLink>
      </div>
    )
  }
  return <ProductGrid products={products.filter((p) => ids.includes(p.id))} />
}
