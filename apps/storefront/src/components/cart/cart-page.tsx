"use client"

import { ShieldCheck, ShoppingBag } from "lucide-react"
import { useCart } from "../providers"
import { ButtonLink } from "../ui/button"
import { CartLine } from "./cart-line"
import { FreeShippingProgress } from "./free-shipping"
import { PromoCode, Totals } from "./cart-summary"

export function CartPageClient({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const { cart, error } = useCart()
  const items = cart?.items ?? []

  return (
    <div className="container-page pt-8 sm:pt-12">
      <h1 className="display text-5xl sm:text-6xl">Coșul tău</h1>
      {!cart ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-12" aria-busy>
          <div className="skeleton h-64 rounded-xl lg:col-span-8" />
          <div className="skeleton h-64 rounded-xl lg:col-span-4" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl bg-paper-2 px-6 py-20 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-surface">
            <ShoppingBag className="h-6 w-6" />
          </span>
          <p className="display mt-5 text-4xl">Coșul e gol</p>
          <p className="mt-2 text-sm text-muted">Produsele adăugate apar aici.</p>
          <ButtonLink href="/shop" className="mt-6">
            Descoperă produsele
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-12">
          <section className="lg:col-span-7 xl:col-span-8" aria-label="Produse în coș">
            <FreeShippingProgress subtotal={cart.item_total ?? 0} threshold={freeShippingThreshold} currency={cart.currency_code} />
            {error && (
              <p role="alert" className="mt-4 rounded-md bg-clay-soft px-4 py-3 text-sm text-clay">
                {error}
              </p>
            )}
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {items.map((item) => (
                <li key={item.id} className="py-6">
                  <CartLine item={item} currency={cart.currency_code} />
                </li>
              ))}
            </ul>
          </section>
          <aside className="flex flex-col gap-6 rounded-xl bg-surface p-6 shadow-soft lg:sticky lg:top-24 lg:col-span-5 xl:col-span-4" aria-label="Sumar comandă">
            <h2 className="text-lg font-medium">Sumar</h2>
            <PromoCode cart={cart} />
            <Totals cart={cart} />
            <ButtonLink href="/checkout" size="lg" className="w-full">
              Finalizează comanda
            </ButtonLink>
            <p className="flex items-center justify-center gap-2 text-xs text-muted">
              <ShieldCheck className="h-4 w-4" /> Plată securizată sau ramburs la livrare
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
