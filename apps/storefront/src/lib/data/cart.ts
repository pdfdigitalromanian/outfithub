import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { sdk } from "../medusa"
import { getAuthHeaders, getCartId } from "../util/cookies"

export const CART_FIELDS = [
  "id",
  "email",
  "currency_code",
  "region_id",
  "customer_id",
  "metadata",
  "total",
  "subtotal",
  "item_subtotal",
  "item_total",
  "original_item_total",
  "shipping_total",
  "shipping_subtotal",
  "tax_total",
  "discount_total",
  "original_total",
  "*items",
  "items.variant.options.value",
  "items.variant.options.option.title",
  "items.variant.manage_inventory",
  "items.variant.allow_backorder",
  "+items.variant.inventory_quantity",
  "*shipping_address",
  "*billing_address",
  "*shipping_methods",
  "*promotions",
  "*payment_collection",
  "*payment_collection.payment_sessions",
].join(",")

export async function retrieveCart(id?: string): Promise<HttpTypes.StoreCart | null> {
  const cartId = id ?? (await getCartId())
  if (!cartId) return null
  try {
    const { cart } = await sdk.client.fetch<{ cart: HttpTypes.StoreCart }>(`/store/carts/${cartId}`, {
      query: { fields: CART_FIELDS },
      headers: await getAuthHeaders(),
      cache: "no-store",
    })
    return cart
  } catch {
    return null
  }
}

export async function listShippingOptions(cartId: string) {
  try {
    const { shipping_options } = await sdk.client.fetch<{ shipping_options: HttpTypes.StoreCartShippingOption[] }>(
      "/store/shipping-options",
      { query: { cart_id: cartId }, headers: await getAuthHeaders(), cache: "no-store" }
    )
    return shipping_options
  } catch {
    return []
  }
}

export async function listPaymentProviders(regionId: string) {
  try {
    const { payment_providers } = await sdk.client.fetch<{ payment_providers: HttpTypes.StorePaymentProvider[] }>(
      "/store/payment-providers",
      { query: { region_id: regionId }, cache: "no-store" }
    )
    return payment_providers
  } catch {
    return []
  }
}
