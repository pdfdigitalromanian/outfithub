"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from "react"
import type { HttpTypes } from "@medusajs/types"
import {
  addToCartAction,
  applyPromotionAction,
  getCartAction,
  removePromotionAction,
  updateLineItemAction,
} from "@/lib/actions/cart"
import { syncWishlistAction, toggleWishlistAction } from "@/lib/actions/wishlist"
import { readJson, writeJson } from "@/lib/client/storage"
import { track } from "@/lib/client/tracking"
import { CONSENT_VERSION, readConsent, writeConsent, type ConsentState } from "@/lib/client/consent"

/* ------------------------------------------------------------------ cart */

type CartCtx = {
  cart: HttpTypes.StoreCart | null
  count: number
  loading: boolean
  open: boolean
  setOpen: (o: boolean) => void
  error: string | null
  add: (variantId: string, quantity: number, meta?: { name: string; price: number; variant?: string; sku?: string | null }) => Promise<boolean>
  update: (lineId: string, quantity: number) => Promise<void>
  applyPromo: (code: string) => Promise<string | undefined>
  removePromo: (code: string) => Promise<void>
  refresh: () => Promise<void>
  setCart: (c: HttpTypes.StoreCart | null) => void
}

const CartContext = createContext<CartCtx | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, startTransition] = useTransition()

  const refresh = useCallback(async () => {
    const res = await getCartAction()
    setCart(res.cart)
  }, [])

  useEffect(() => {
    // Sync with the server-held cart (httpOnly cookie) once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const add: CartCtx["add"] = useCallback(async (variantId, quantity, meta) => {
    setError(null)
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const res = await addToCartAction(variantId, quantity)
        setCart(res.cart)
        if (res.error) {
          setError(res.error)
          resolve(false)
          return
        }
        setOpen(true)
        if (meta) track("add_to_cart", { items: [{ id: meta.sku || variantId, name: meta.name, price: meta.price, quantity, variant: meta.variant }] })
        resolve(true)
      })
    })
  }, [])

  const update: CartCtx["update"] = useCallback(async (lineId, quantity) => {
    setError(null)
    const res = await updateLineItemAction(lineId, quantity)
    setCart(res.cart)
    if (res.error) setError(res.error)
  }, [])

  const applyPromo = useCallback(async (code: string) => {
    const res = await applyPromotionAction(code)
    setCart(res.cart)
    return res.error
  }, [])

  const removePromo = useCallback(async (code: string) => {
    const res = await removePromotionAction(code)
    setCart(res.cart)
  }, [])

  const count = useMemo(() => (cart?.items ?? []).reduce((s, i) => s + i.quantity, 0), [cart])

  return (
    <CartContext.Provider value={{ cart, count, loading, open, setOpen, error, add, update, applyPromo, removePromo, refresh, setCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside CartProvider")
  return ctx
}

/* -------------------------------------------------------------- wishlist */

type WishlistCtx = { ids: string[]; has: (id: string) => boolean; toggle: (id: string, meta?: { name: string; price: number }) => void; ready: boolean }
const WishlistContext = createContext<WishlistCtx | null>(null)
const WISHLIST_KEY = "oh_wishlist"

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [remote, setRemote] = useState(false)

  useEffect(() => {
    const local = readJson<string[]>(WISHLIST_KEY, [])
    // Hydrate from localStorage (browser-only external store).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIds(local)
    // Logged-in shoppers: merge the guest list into the account and use it.
    syncWishlistAction(local).then((res) => {
      if (res.product_ids) {
        setRemote(true)
        setIds(res.product_ids)
        writeJson(WISHLIST_KEY, res.product_ids)
      }
      setReady(true)
    })
  }, [])

  const toggle = useCallback(
    (id: string, meta?: { name: string; price: number }) => {
      setIds((prev) => {
        const adding = !prev.includes(id)
        const next = adding ? [id, ...prev] : prev.filter((x) => x !== id)
        writeJson(WISHLIST_KEY, next)
        if (remote) void toggleWishlistAction(id, adding)
        if (adding && meta) track("add_to_wishlist", { items: [{ id, name: meta.name, price: meta.price }] })
        return next
      })
    },
    [remote]
  )

  const value = useMemo(() => ({ ids, has: (id: string) => ids.includes(id), toggle, ready }), [ids, toggle, ready])
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider")
  return ctx
}

/* --------------------------------------------------------------- consent */

type ConsentCtx = {
  consent: ConsentState | null
  decided: boolean
  save: (s: { preferences: boolean; analytics: boolean; marketing: boolean }) => void
  preferencesOpen: boolean
  openPreferences: (o: boolean) => void
}
const ConsentContext = createContext<ConsentCtx | null>(null)

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(null)
  const [decided, setDecided] = useState(true)
  const [preferencesOpen, openPreferences] = useState(false)

  useEffect(() => {
    const c = readConsent()
    // Hydrate from the consent cookie (browser-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(c)
    setDecided(!!c && c.v === CONSENT_VERSION)
    const onOpen = () => openPreferences(true)
    window.addEventListener("oh:open-consent", onOpen)
    return () => window.removeEventListener("oh:open-consent", onOpen)
  }, [])

  const save = useCallback((s: { preferences: boolean; analytics: boolean; marketing: boolean }) => {
    const next = writeConsent(s)
    setConsent(next)
    setDecided(true)
    openPreferences(false)
    // Google Consent Mode v2 update (gtag stub always exists, see TrackingScripts).
    window.gtag?.("consent", "update", {
      analytics_storage: s.analytics ? "granted" : "denied",
      ad_storage: s.marketing ? "granted" : "denied",
      ad_user_data: s.marketing ? "granted" : "denied",
      ad_personalization: s.marketing ? "granted" : "denied",
      personalization_storage: s.preferences ? "granted" : "denied",
    })
  }, [])

  return (
    <ConsentContext.Provider value={{ consent, decided, save, preferencesOpen, openPreferences }}>{children}</ConsentContext.Provider>
  )
}

export const useConsent = () => {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error("useConsent must be used inside ConsentProvider")
  return ctx
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConsentProvider>
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
    </ConsentProvider>
  )
}
