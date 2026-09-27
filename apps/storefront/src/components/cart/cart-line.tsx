"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Minus, Plus, Trash2 } from "lucide-react"
import type { HttpTypes } from "@medusajs/types"
import { useCart } from "../providers"
import { formatMoney } from "@/lib/util/format"
import { cn } from "@/lib/util/cn"

export function CartLine({ item, currency, compact }: { item: HttpTypes.StoreCartLineItem; currency: string; compact?: boolean }) {
  const { update } = useCart()
  const [busy, setBusy] = useState(false)
  const variant = item.variant as any
  const maxQty = variant?.manage_inventory && !variant?.allow_backorder ? variant?.inventory_quantity ?? 99 : 99
  const change = async (q: number) => {
    setBusy(true)
    await update(item.id, q)
    setBusy(false)
  }
  const options = (variant?.options ?? [])
    .map((o: any) => (o.option?.title ? `${o.option.title}: ${o.value}` : o.value))
    .join(" · ")

  return (
    <div className={cn("flex gap-4", busy && "opacity-60 transition-opacity")}>
      <Link href={`/products/${item.product_handle}`} className="product-frame relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-md sm:w-24">
        {item.thumbnail && <Image src={item.thumbnail} alt={item.product_title ?? ""} fill sizes="96px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/products/${item.product_handle}`} className="line-clamp-2 text-sm font-medium hover:underline">
              {item.product_title}
            </Link>
            <p className="mt-0.5 text-xs text-muted">{options || item.variant_title}</p>
          </div>
          <p className="shrink-0 text-sm tabular-nums">{formatMoney(item.total ?? item.unit_price * item.quantity, currency)}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center rounded-full border border-line">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/[0.06] disabled:opacity-40"
              onClick={() => change(item.quantity - 1)}
              disabled={busy}
              aria-label={`Scade cantitatea pentru ${item.product_title}`}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-sm tabular-nums" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/[0.06] disabled:opacity-40"
              onClick={() => change(item.quantity + 1)}
              disabled={busy || item.quantity >= maxQty}
              aria-label={`Crește cantitatea pentru ${item.product_title}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {!compact && (
            <button type="button" onClick={() => change(0)} disabled={busy} className="flex items-center gap-1 text-xs text-muted hover:text-ink">
              <Trash2 className="h-3.5 w-3.5" /> Elimină
            </button>
          )}
          {compact && (
            <button type="button" onClick={() => change(0)} disabled={busy} className="text-xs text-muted underline-offset-2 hover:underline" aria-label={`Elimină ${item.product_title}`}>
              Elimină
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
