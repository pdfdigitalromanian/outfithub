/**
 * Consent-aware ecommerce event dispatcher for GA4 (gtag), Meta Pixel (fbq)
 * and TikTok Pixel (ttq). Scripts are only loaded after consent (see
 * TrackingScripts); calls are no-ops otherwise. Purchase uses the order id as
 * event_id so browser + server (Conversions API / Events API) deduplicate.
 */
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
    ttq?: { track: (event: string, data?: Record<string, unknown>, opts?: Record<string, unknown>) => void; page: () => void }
  }
}

export type TrackItem = {
  id: string
  name: string
  price: number
  quantity?: number
  variant?: string
  category?: string
}

type EventName = "view_item" | "view_item_list" | "add_to_cart" | "remove_from_cart" | "begin_checkout" | "add_shipping_info" | "add_payment_info" | "purchase" | "search" | "add_to_wishlist"

const META_MAP: Partial<Record<EventName, string>> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  search: "Search",
  add_to_wishlist: "AddToWishlist",
}

const TIKTOK_MAP: Partial<Record<EventName, string>> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "CompletePayment",
  search: "Search",
  add_to_wishlist: "AddToWishlist",
}

export function track(
  event: EventName,
  data: { items?: TrackItem[]; value?: number; currency?: string; transaction_id?: string; search_term?: string; shipping_tier?: string; payment_type?: string; event_id?: string }
) {
  if (typeof window === "undefined") return
  const currency = (data.currency ?? "RON").toUpperCase()
  const items = data.items ?? []
  const value = data.value ?? items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0)

  window.gtag?.("event", event, {
    currency,
    value,
    ...(data.transaction_id ? { transaction_id: data.transaction_id } : {}),
    ...(data.search_term ? { search_term: data.search_term } : {}),
    ...(data.shipping_tier ? { shipping_tier: data.shipping_tier } : {}),
    ...(data.payment_type ? { payment_type: data.payment_type } : {}),
    items: items.map((i) => ({
      item_id: i.id,
      item_name: i.name,
      price: i.price,
      quantity: i.quantity ?? 1,
      item_variant: i.variant,
      item_category: i.category,
    })),
  })

  const metaEvent = META_MAP[event]
  if (metaEvent && window.fbq) {
    window.fbq(
      "track",
      metaEvent,
      {
        currency,
        value,
        content_type: "product",
        content_ids: items.map((i) => i.id),
        contents: items.map((i) => ({ id: i.id, quantity: i.quantity ?? 1, item_price: i.price })),
        ...(data.search_term ? { search_string: data.search_term } : {}),
      },
      data.event_id ? { eventID: data.event_id } : undefined
    )
  }

  const ttEvent = TIKTOK_MAP[event]
  if (ttEvent && window.ttq) {
    window.ttq.track(
      ttEvent,
      {
        currency,
        value,
        content_type: "product",
        contents: items.map((i) => ({ content_id: i.id, content_name: i.name, quantity: i.quantity ?? 1, price: i.price })),
        ...(data.search_term ? { query: data.search_term } : {}),
      },
      data.event_id ? { event_id: data.event_id } : undefined
    )
  }
}
