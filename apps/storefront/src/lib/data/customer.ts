import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { sdk } from "../medusa"
import { getAuthHeaders } from "../util/cookies"

export async function getCustomer(): Promise<HttpTypes.StoreCustomer | null> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return null
  try {
    const { customer } = await sdk.client.fetch<{ customer: HttpTypes.StoreCustomer }>("/store/customers/me", {
      query: { fields: "*addresses,id,email,first_name,last_name,phone,created_at" },
      headers,
      cache: "no-store",
    })
    return customer
  } catch {
    return null
  }
}

export async function listOrders(limit = 20, offset = 0) {
  const headers = await getAuthHeaders()
  try {
    return await sdk.client.fetch<{ orders: HttpTypes.StoreOrder[]; count: number }>("/store/orders", {
      query: { limit, offset, order: "-created_at", fields: "id,display_id,created_at,status,fulfillment_status,payment_status,total,currency_code,*items" },
      headers,
      cache: "no-store",
    })
  } catch {
    return { orders: [], count: 0 }
  }
}

export async function getOrder(id: string) {
  try {
    const { order } = await sdk.client.fetch<{ order: HttpTypes.StoreOrder }>(`/store/orders/${id}`, {
      query: {
        fields:
          "id,display_id,email,customer_id,created_at,status,fulfillment_status,payment_status,currency_code,total,subtotal,item_subtotal,shipping_total,tax_total,discount_total,*items,*shipping_address,*billing_address,*shipping_methods,*fulfillments,*fulfillments.labels,*payment_collections.payments,metadata",
      },
      headers: await getAuthHeaders(),
      cache: "no-store",
    })
    return order
  } catch {
    return null
  }
}

export async function getWishlistIds(): Promise<string[] | null> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return null
  try {
    const { wishlist } = await sdk.client.fetch<{ wishlist: { product_ids: string[] } }>("/store/customers/me/wishlist", {
      headers,
      cache: "no-store",
    })
    return wishlist.product_ids
  } catch {
    return null
  }
}
