"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Ruler, Truck, RotateCcw } from "lucide-react"
import type { VariantInfo } from "@/lib/catalog"
import { COLOR_RX, SIZE_RX, sortSizes, swatchFor } from "@/lib/catalog"
import { useCart } from "../providers"
import { Button } from "../ui/button"
import { Price } from "../ui/price"
import { WishlistButton } from "./wishlist-button"
import { SizeGuide } from "./size-guide"
import { cn } from "@/lib/util/cn"

type Option = { title: string; values: string[] }

export function ProductInfo({
  product,
  options,
  variants,
  deliveryEstimate,
  returnsDays,
}: {
  product: { id: string; title: string; subtitle: string | null; collection: string | null }
  options: Option[]
  variants: VariantInfo[]
  deliveryEstimate: string
  returnsDays: number
}) {
  const { add, loading, error } = useCart()
  const [added, setAdded] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const [sizeGuide, setSizeGuide] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const ctaRef = useRef<HTMLDivElement>(null)

  const sortedOptions = useMemo(
    () => options.map((o) => ({ ...o, values: SIZE_RX.test(o.title) ? sortSizes(o.values) : o.values })),
    [options]
  )

  // Server-rendered default selection; a ?variant= deep link is applied after
  // hydration so the page stays statically renderable (no CSR bailout / CLS).
  const initial = useMemo(() => {
    if (variants.length === 1) return variants[0].options
    // Preselect the first in-stock color, leave size for the shopper.
    const colorOpt = sortedOptions.find((o) => COLOR_RX.test(o.title))
    const firstInStock = variants.find((v) => v.inStock)
    return colorOpt && firstInStock ? { [colorOpt.title]: firstInStock.options[colorOpt.title] } : {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [selected, setSelected] = useState<Record<string, string>>(initial)

  const variant = useMemo(
    () => variants.find((v) => sortedOptions.every((o) => v.options[o.title] === selected[o.title])),
    [variants, sortedOptions, selected]
  )

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("variant")
    const fromUrl = id ? variants.find((v) => v.id === id) : null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fromUrl) setSelected(fromUrl.options)
  }, [variants])

  useEffect(() => {
    if (!variant || variants.length < 2) return
    const url = new URL(window.location.href)
    if (url.searchParams.get("variant") === variant.id) return
    url.searchParams.set("variant", variant.id)
    window.history.replaceState(window.history.state, "", url)
  }, [variant, variants.length])

  useEffect(() => {
    const el = ctaRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const isAvailable = (title: string, value: string) =>
    variants.some(
      (v) => v.inStock && v.options[title] === value && sortedOptions.every((o) => o.title === title || !selected[o.title] || v.options[o.title] === selected[o.title])
    )

  const priceVariant = variant ?? [...variants].filter((v) => v.price != null).sort((a, b) => a.price! - b.price!)[0]
  const missing = sortedOptions.filter((o) => !selected[o.title]).map((o) => o.title.toLowerCase())
  const lowStock = variant?.quantity != null && variant.quantity > 0 && variant.quantity <= 3

  const onAdd = async () => {
    setAttempted(true)
    if (!variant || !variant.inStock) return
    const ok = await add(variant.id, 1, { name: product.title, price: variant.price ?? 0, variant: variant.title, sku: variant.sku })
    if (ok) {
      setAdded(true)
      setTimeout(() => setAdded(false), 2200)
    }
  }

  const ctaLabel = !variant
    ? missing.length
      ? `Alege ${missing.join(" și ")}`
      : "Indisponibil"
    : !variant.inStock
      ? "Stoc epuizat"
      : added
        ? "Adăugat în coș"
        : "Adaugă în coș"

  return (
    <div className="flex flex-col gap-7">
      <div>
        {product.collection && <p className="eyebrow mb-3">{product.collection}</p>}
        <h1 className="display text-[2.6rem] leading-[1] sm:text-5xl">{product.title}</h1>
        {product.subtitle && <p className="mt-3 text-sm text-muted">{product.subtitle}</p>}
        <div className="mt-5">
          <Price amount={priceVariant?.price ?? null} original={priceVariant?.originalPrice} currency={priceVariant?.currency} size="lg" from={!variant && new Set(variants.map((v) => v.price)).size > 1} />
          <p className="mt-1 text-xs text-muted">TVA inclus</p>
        </div>
      </div>

      {sortedOptions.map((o) => {
        const isColor = COLOR_RX.test(o.title)
        const isSize = SIZE_RX.test(o.title)
        const showError = attempted && !selected[o.title]
        return (
          <fieldset key={o.title} className="relative">
            {/* float makes the legend participate in normal flow (margins apply) */}
            <legend className="float-left mb-3 w-full pr-28 text-sm">
              <span className="font-medium">{o.title}</span>
              {selected[o.title] && <span className="text-muted">: {selected[o.title]}</span>}
            </legend>
            {isSize && (
              <button type="button" onClick={() => setSizeGuide(true)} className="absolute right-0 top-0 inline-flex items-center gap-1.5 text-xs text-muted underline-offset-4 hover:text-ink hover:underline">
                <Ruler className="h-3.5 w-3.5" /> Ghid mărimi
              </button>
            )}
            <div className={cn("clear-both flex flex-wrap gap-2", isSize && "grid grid-cols-4 sm:grid-cols-5", showError && "rounded-lg ring-2 ring-clay/40 ring-offset-4 ring-offset-paper")}>
              {o.values.map((value) => {
                const active = selected[o.title] === value
                const available = isAvailable(o.title, value)
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${o.title} ${value}${available ? "" : " – indisponibil"}`}
                    onClick={() => setSelected((s) => ({ ...s, [o.title]: value }))}
                    className={cn(
                      "relative inline-flex h-12 items-center justify-center gap-2 rounded-full border text-sm transition-all",
                      isColor ? "px-4 pr-5" : "px-3",
                      active ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:border-ink",
                      !available && !active && "text-subtle",
                      !available && "after:absolute after:inset-x-3 after:top-1/2 after:h-px after:-rotate-12 after:bg-current after:opacity-50"
                    )}
                  >
                    {isColor && <span className={cn("h-5 w-5 rounded-full border", active ? "border-paper/50 ring-1 ring-paper/30" : "border-ink/15")} style={{ background: swatchFor(value) }} aria-hidden />}
                    {value}
                  </button>
                )
              })}
            </div>
            {showError && (
              <p role="alert" className="mt-2 text-xs text-clay">
                Alege {o.title.toLowerCase()}.
              </p>
            )}
          </fieldset>
        )
      })}

      <div ref={ctaRef} className="flex flex-col gap-3">
        {lowStock && <p className="text-xs font-medium text-clay">Doar {variant!.quantity} în stoc</p>}
        <div className="flex gap-2">
          <Button size="lg" className="flex-1" onClick={onAdd} loading={loading} disabled={!!variant && !variant.inStock}>
            {added && <Check className="h-4 w-4" />}
            {ctaLabel}
          </Button>
          <WishlistButton productId={product.id} name={product.title} price={priceVariant?.price} variant="inline" />
        </div>
        {error && (
          <p role="alert" className="text-xs text-clay">
            {error}
          </p>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <li className="flex items-center gap-3 rounded-md bg-paper-2 px-4 py-3">
          <Truck className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Livrare în <strong className="font-medium">{deliveryEstimate}</strong>
          </span>
        </li>
        <li className="flex items-center gap-3 rounded-md bg-paper-2 px-4 py-3">
          <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Retur în <strong className="font-medium">{returnsDays} de zile</strong>
          </span>
        </li>
      </ul>

      {/* Sticky mobile buy bar */}
      <div
        className={cn(
          "fixed inset-x-2 bottom-2 z-30 flex items-center gap-3 rounded-full glass p-2 pl-5 transition-all duration-300 md:hidden",
          showSticky ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"
        )}
        aria-hidden={!showSticky}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{product.title}</p>
          <Price amount={priceVariant?.price ?? null} original={priceVariant?.originalPrice} currency={priceVariant?.currency} size="sm" />
        </div>
        <Button
          size="md"
          onClick={() => (variant ? onAdd() : ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }))}
          loading={loading}
          disabled={!!variant && !variant.inStock}
          tabIndex={showSticky ? 0 : -1}
        >
          {variant ? (variant.inStock ? "Adaugă" : "Epuizat") : "Alege"}
        </Button>
      </div>

      <SizeGuide open={sizeGuide} onOpenChange={setSizeGuide} />
    </div>
  )
}
