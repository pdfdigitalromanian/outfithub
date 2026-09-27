"use client"

import { Heart } from "lucide-react"
import { useWishlist } from "../providers"
import { cn } from "@/lib/util/cn"

export function WishlistButton({
  productId,
  name,
  price,
  className,
  variant = "floating",
}: {
  productId: string
  name: string
  price?: number | null
  className?: string
  variant?: "floating" | "inline"
}) {
  const { has, toggle } = useWishlist()
  const active = has(productId)
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Elimină ${name} din favorite` : `Adaugă ${name} la favorite`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(productId, { name, price: price ?? 0 })
      }}
      className={cn(
        "grid place-items-center rounded-full transition-all duration-200 active:scale-90",
        variant === "floating" ? "h-9 w-9 glass hover:bg-white" : "h-14 w-14 border border-line bg-surface hover:border-ink",
        className
      )}
    >
      <Heart className={cn("h-[18px] w-[18px] transition-colors", active ? "fill-clay stroke-clay" : "stroke-ink")} />
    </button>
  )
}
