"use client"

import { ShoppingBag } from "lucide-react"
import { useCart } from "../providers"
import { Sheet } from "../ui/sheet"
import { ButtonLink } from "../ui/button"
import { CartLine } from "./cart-line"
import { FreeShippingProgress } from "./free-shipping"
import { formatMoney } from "@/lib/util/format"

export function CartDrawer({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const { cart, open, setOpen, count, error } = useCart()
  const items = [...(cart?.items ?? [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  const currency = cart?.currency_code ?? "ron"
  const subtotal = cart?.item_total ?? 0

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={`Coșul tău${count ? ` (${count})` : ""}`}
      footer={
        items.length ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="text-base font-medium tabular-nums">{formatMoney(subtotal, currency)}</span>
            </div>
            <p className="text-xs text-muted">TVA inclus. Livrarea se calculează la finalizare.</p>
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink href="/cart" variant="secondary">
                Vezi coșul
              </ButtonLink>
              <ButtonLink href="/checkout">Finalizează</ButtonLink>
            </div>
          </div>
        ) : undefined
      }
    >
      {items.length ? (
        <div className="flex flex-col gap-5 px-5 py-5">
          <FreeShippingProgress subtotal={subtotal} threshold={freeShippingThreshold} currency={currency} />
          {error && (
            <p role="alert" className="rounded-md bg-clay-soft px-3 py-2 text-xs text-clay">
              {error}
            </p>
          )}
          <ul className="flex flex-col gap-5">
            {items.map((item) => (
              <li key={item.id}>
                <CartLine item={item} currency={currency} compact />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-paper-2">
            <ShoppingBag className="h-6 w-6" />
          </span>
          <p className="display text-3xl">Coșul e gol</p>
          <p className="text-sm text-muted">Descoperă piesele noi și adaugă-le aici.</p>
          <ButtonLink href="/shop" className="mt-2">
            Mergi la magazin
          </ButtonLink>
        </div>
      )}
    </Sheet>
  )
}
