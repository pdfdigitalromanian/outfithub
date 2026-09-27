import type { Metadata } from "next"
import { WishlistView } from "@/components/product/wishlist-view"

export const metadata: Metadata = { title: "Favorite", robots: { index: false, follow: true } }

export default function WishlistPage() {
  return (
    <div className="container-page pt-8 sm:pt-12">
      <p className="eyebrow">Salvate pentru mai târziu</p>
      <h1 className="display mt-2 text-5xl sm:text-6xl">Favorite</h1>
      <div className="mt-10">
        <WishlistView />
      </div>
    </div>
  )
}
