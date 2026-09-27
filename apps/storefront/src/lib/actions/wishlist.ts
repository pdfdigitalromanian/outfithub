"use server"

import { sdk } from "../medusa"
import { getAuthHeaders } from "../util/cookies"

type Result = { product_ids: string[] | null }

/** Returns null when the shopper is a guest (wishlist then lives in localStorage). */
export async function syncWishlistAction(localIds: string[]): Promise<Result> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return { product_ids: null }
  try {
    if (localIds.length) {
      const { wishlist } = await sdk.client.fetch<{ wishlist: { product_ids: string[] } }>("/store/customers/me/wishlist", {
        method: "POST",
        body: { product_ids: localIds.slice(0, 100) },
        headers,
      })
      return { product_ids: wishlist.product_ids }
    }
    const { wishlist } = await sdk.client.fetch<{ wishlist: { product_ids: string[] } }>("/store/customers/me/wishlist", { headers, cache: "no-store" })
    return { product_ids: wishlist.product_ids }
  } catch {
    return { product_ids: null }
  }
}

export async function toggleWishlistAction(productId: string, add: boolean): Promise<Result> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return { product_ids: null }
  try {
    const { wishlist } = add
      ? await sdk.client.fetch<{ wishlist: { product_ids: string[] } }>("/store/customers/me/wishlist", {
          method: "POST",
          body: { product_ids: [productId] },
          headers,
        })
      : await sdk.client.fetch<{ wishlist: { product_ids: string[] } }>(`/store/customers/me/wishlist/${encodeURIComponent(productId)}`, {
          method: "DELETE",
          headers,
        })
    return { product_ids: wishlist.product_ids }
  } catch {
    return { product_ids: null }
  }
}
