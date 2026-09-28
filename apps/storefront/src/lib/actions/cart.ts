"use server"

import { validEmail } from "../util/account-validation"
import { validCheckoutAddress } from "../util/checkout-validation"
import type { HttpTypes } from "@medusajs/types"
import { headers as nextHeaders } from "next/headers"
import { sdk } from "../medusa"
import { getRegion } from "../data/regions"
import { CART_FIELDS, retrieveCart } from "../data/cart"
import { getAuthHeaders, getCartId, removeCartId, setCartId } from "../util/cookies"

export type CartResult = { cart: HttpTypes.StoreCart | null; error?: string }

const errorMessage = (e: unknown) => {
  const msg = (e as Error)?.message ?? "A apărut o eroare. Încearcă din nou."
  if (/inventory|stock|stoc/i.test(msg)) return "Stoc insuficient pentru cantitatea aleasă."
  return msg
}

async function ensureCart(): Promise<HttpTypes.StoreCart> {
  const existing = await retrieveCart()
  if (existing && !(existing as any).completed_at) return existing
  const region = await getRegion()
  if (!region) throw new Error("Magazinul nu este configurat (lipsește regiunea).")
  const { cart } = await sdk.store.cart.create({ region_id: region.id }, { fields: CART_FIELDS }, await getAuthHeaders())
  await setCartId(cart.id)
  return cart
}

export async function getCartAction(): Promise<CartResult> {
  return { cart: await retrieveCart() }
}

export async function addToCartAction(variantId: string, quantity = 1): Promise<CartResult> {
  if (!variantId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) return { cart: await retrieveCart(), error: "Alege o cantitate între 1 și 99." }
  try {
    const cart = await ensureCart()
    await sdk.store.cart.createLineItem(cart.id, { variant_id: variantId, quantity }, {}, await getAuthHeaders())
    return { cart: await retrieveCart(cart.id) }
  } catch (e) {
    return { cart: await retrieveCart(), error: errorMessage(e) }
  }
}

export async function updateLineItemAction(lineId: string, quantity: number): Promise<CartResult> {
  const cartId = await getCartId()
  if (!cartId) return { cart: null }
  try {
    if (quantity <= 0) await sdk.store.cart.deleteLineItem(cartId, lineId, {}, await getAuthHeaders())
    else await sdk.store.cart.updateLineItem(cartId, lineId, { quantity }, {}, await getAuthHeaders())
    return { cart: await retrieveCart(cartId) }
  } catch (e) {
    return { cart: await retrieveCart(cartId), error: errorMessage(e) }
  }
}

export async function applyPromotionAction(code: string): Promise<CartResult> {
  const cartId = await getCartId()
  if (!cartId || !code.trim()) return { cart: await retrieveCart() }
  try {
    await sdk.store.cart.addPromotions(cartId, { promo_codes: [code.trim().toUpperCase()] }, {}, await getAuthHeaders())
    const cart = await retrieveCart(cartId)
    const applied = cart?.promotions?.some((p) => p.code?.toUpperCase() === code.trim().toUpperCase())
    return { cart, error: applied ? undefined : "Codul nu este valid sau nu se aplică acestui coș." }
  } catch {
    return { cart: await retrieveCart(cartId), error: "Codul nu este valid sau nu se aplică acestui coș." }
  }
}

export async function removePromotionAction(code: string): Promise<CartResult> {
  const cartId = await getCartId()
  if (!cartId) return { cart: null }
  await sdk.store.cart.removePromotions(cartId, { promo_codes: [code] }, {}, await getAuthHeaders()).catch(() => null)
  return { cart: await retrieveCart(cartId) }
}

export type AddressInput = {
  first_name: string
  last_name: string
  phone: string
  address_1: string
  address_2?: string
  city: string
  province: string
  postal_code: string
  company?: string
  country_code?: string
}

export type TrackingContext = {
  consent?: { analytics?: boolean; marketing?: boolean }
  fbp?: string
  fbc?: string
  ttp?: string
  ttclid?: string
  ga_client_id?: string
  page_url?: string
}

/** Saves contact + addresses. Billing defaults to the shipping address. */
export async function updateCheckoutDetailsAction(input: {
  email: string
  shipping: AddressInput
  billing?: AddressInput | null
  tracking?: TrackingContext
}): Promise<CartResult> {
  const cartId = await getCartId()
  if (!cartId) return { cart: null, error: "Coșul a expirat." }
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : ""
  if (!validEmail(email)) return { cart: await retrieveCart(cartId), error: "Adresa de e-mail nu este validă." }
  if (!validCheckoutAddress(input.shipping) || (input.billing && !validCheckoutAddress(input.billing))) return { cart: await retrieveCart(cartId), error: "Verifică numele, adresa și telefonul de livrare / facturare." }
  const clean = (a: AddressInput) => ({
    first_name: a.first_name.trim().slice(0, 100),
    last_name: a.last_name.trim().slice(0, 100),
    phone: a.phone.replace(/[^\d+]/g, "").slice(0, 20),
    address_1: a.address_1.trim().slice(0, 200),
    address_2: (a.address_2 ?? "").trim().slice(0, 200),
    city: a.city.trim().slice(0, 100),
    province: a.province.trim().slice(0, 100),
    postal_code: (a.postal_code ?? "").trim().slice(0, 12),
    company: (a.company ?? "").trim().slice(0, 150),
    country_code: "ro",
  })
  const h = await nextHeaders()
  const tracking = input.tracking
    ? {
        ...input.tracking,
        ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined,
        user_agent: h.get("user-agent") ?? undefined,
      }
    : undefined
  try {
    const current = await retrieveCart(cartId)
    await sdk.store.cart.update(
      cartId,
      {
        email,
        shipping_address: clean(input.shipping),
        billing_address: clean(input.billing ?? input.shipping),
        metadata: { ...(current?.metadata ?? {}), ...(tracking ? { tracking } : {}) },
      },
      {},
      await getAuthHeaders()
    )
    return { cart: await retrieveCart(cartId) }
  } catch (e) {
    return { cart: await retrieveCart(cartId), error: errorMessage(e) }
  }
}

export async function setShippingMethodAction(
  optionId: string,
  data?: { locker_id: string; locker_name?: string; locker_address?: string; locker_city?: string }
): Promise<CartResult> {
  const cartId = await getCartId()
  if (!cartId) return { cart: null, error: "Coșul a expirat." }
  try {
    await sdk.store.cart.addShippingMethod(cartId, { option_id: optionId, ...(data ? { data } : {}) }, {}, await getAuthHeaders())
    return { cart: await retrieveCart(cartId) }
  } catch (e) {
    return { cart: await retrieveCart(cartId), error: errorMessage(e) }
  }
}

export async function initiatePaymentAction(providerId: string): Promise<CartResult & { clientSecret?: string }> {
  const cart = await retrieveCart()
  if (!cart) return { cart: null, error: "Coșul a expirat." }
  try {
    await sdk.store.payment.initiatePaymentSession(cart, { provider_id: providerId }, {}, await getAuthHeaders())
    const updated = await retrieveCart(cart.id)
    const session = updated?.payment_collection?.payment_sessions?.find((s) => s.provider_id === providerId)
    return { cart: updated, clientSecret: (session?.data as any)?.client_secret }
  } catch (e) {
    return { cart, error: errorMessage(e) }
  }
}

/** Persist the final consent snapshot before a payment provider redirects away. */
export async function prepareOrderAction(acceptedTerms: boolean, tracking: TrackingContext): Promise<{ error?: string }> {
  if (acceptedTerms !== true) return { error: "Acceptă termenii și condițiile pentru a continua." }
  const cart = await retrieveCart()
  if (!cart?.items?.length || !cart.shipping_methods?.length) return { error: "Verifică produsele și livrarea înainte de plată." }
  const h = await nextHeaders()
  const finalTracking = {
    ...tracking,
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined,
    user_agent: h.get("user-agent") ?? undefined,
  }
  try {
    await sdk.store.cart.update(cart.id, {
      metadata: { ...cart.metadata, terms_accepted_at: new Date().toISOString(), terms_version: "1", tracking: finalTracking },
    }, {}, await getAuthHeaders())
    return {}
  } catch {
    return { error: "Nu am putut salva confirmarea. Încearcă din nou." }
  }
}

export async function placeOrderAction(): Promise<{ orderId?: string; error?: string; cart?: HttpTypes.StoreCart | null }> {
  const cartId = await getCartId()
  if (!cartId) return { error: "Coșul a expirat." }
  const current = await retrieveCart(cartId)
  if (!current?.metadata?.terms_accepted_at) return { error: "Acceptă termenii și condițiile înainte de a plasa comanda." }
  try {
    const res = await sdk.store.cart.complete(cartId, {}, await getAuthHeaders())
    if (res.type === "order") {
      await removeCartId()
      return { orderId: res.order.id }
    }
    return { error: res.error?.message ?? "Comanda nu a putut fi plasată.", cart: res.cart }
  } catch (e) {
    return { error: errorMessage(e), cart: await retrieveCart(cartId) }
  }
}
