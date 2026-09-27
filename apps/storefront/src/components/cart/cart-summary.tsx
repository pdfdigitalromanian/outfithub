"use client"

import { useState } from "react"
import { Tag, X } from "lucide-react"
import type { HttpTypes } from "@medusajs/types"
import { useCart } from "../providers"
import { formatMoney } from "@/lib/util/format"

export function Totals({ cart, showShipping = true }: { cart: HttpTypes.StoreCart; showShipping?: boolean }) {
  const c = cart.currency_code
  const hasShipping = (cart.shipping_methods?.length ?? 0) > 0
  return (
    <dl className="flex flex-col gap-2.5 text-sm">
      <Row label="Subtotal" value={formatMoney(cart.item_subtotal ?? cart.item_total, c)} />
      {(cart.discount_total ?? 0) > 0 && <Row label="Reducere" value={`−${formatMoney(cart.discount_total, c)}`} accent />}
      {showShipping && <Row label="Livrare" value={hasShipping ? (cart.shipping_total ? formatMoney(cart.shipping_total, c) : "Gratuită") : "Calculată la pasul următor"} muted={!hasShipping} />}
      <div className="my-1 border-t border-line" />
      <div className="flex items-baseline justify-between">
        <dt className="font-medium">Total</dt>
        <dd className="text-xl font-medium tabular-nums">{formatMoney(cart.total, c)}</dd>
      </div>
      <p className="text-xs text-muted">Include TVA {formatMoney(cart.tax_total, c)}</p>
    </dl>
  )
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`tabular-nums ${muted ? "text-xs text-muted" : ""} ${accent ? "text-moss" : ""}`}>{value}</dd>
    </div>
  )
}

export function PromoCode({ cart }: { cart: HttpTypes.StoreCart }) {
  const { applyPromo, removePromo } = useCart()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const codes = (cart.promotions ?? []).map((p) => p.code).filter(Boolean) as string[]
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!code.trim()) return
          setBusy(true)
          const err = await applyPromo(code)
          setBusy(false)
          setError(err)
          if (!err) setCode("")
        }}
      >
        <label className="relative flex-1">
          <span className="sr-only">Cod de reducere</span>
          <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Cod de reducere"
            aria-invalid={!!error || undefined}
            className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm uppercase outline-none placeholder:normal-case focus:border-ink"
          />
        </label>
        <button type="submit" disabled={busy} className="h-11 rounded-full border border-ink px-5 text-sm font-medium hover:bg-ink hover:text-paper disabled:opacity-50">
          Aplică
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-xs text-clay">
          {error}
        </p>
      )}
      {codes.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {codes.map((c) => (
            <li key={c}>
              <button type="button" onClick={() => removePromo(c)} className="inline-flex items-center gap-1.5 rounded-full bg-moss-soft px-3 py-1.5 text-xs font-medium text-moss" aria-label={`Elimină codul ${c}`}>
                {c} <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
