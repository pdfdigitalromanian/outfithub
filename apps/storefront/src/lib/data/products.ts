import "server-only"
import { cache } from "react"
import type { HttpTypes } from "@medusajs/types"
import { sdk } from "../medusa"
import { getRegion } from "./regions"
import { toCard, type ProductCardData } from "../catalog"
import { buildSafe } from "../util/resilience"

export const PRODUCT_FIELDS = [
  "id",
  "handle",
  "title",
  "subtitle",
  "description",
  "thumbnail",
  "created_at",
  "updated_at",
  "material",
  "collection.id",
  "collection.handle",
  "collection.title",
  "categories.id",
  "categories.handle",
  "categories.name",
  "images.id",
  "images.url",
  "options.id",
  "options.title",
  "options.values.value",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.barcode",
  "variants.ean",
  "variants.upc",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.options.value",
  "variants.options.option_id",
  "variants.options.option.title",
  "*variants.calculated_price",
  "+variants.inventory_quantity",
  "tags.value",
].join(",")

/**
 * Loads the full published catalog for the storefront sales channel, cached
 * for 60s under the "products" tag (purged by the backend on product changes).
 * Filtering/sorting by option values and price happens in-process: fast and
 * accurate for boutique-size catalogs (up to a few thousand products).
 */
export const getAllProducts = cache(async (): Promise<HttpTypes.StoreProduct[]> => {
  const region = await getRegion()
  const out: HttpTypes.StoreProduct[] = []
  const limit = 100
  for (let offset = 0; offset < 5000; offset += limit) {
    const res = await sdk.client
      .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>("/store/products", {
        query: { limit, offset, fields: PRODUCT_FIELDS, ...(region ? { region_id: region.id } : {}) },
        next: { revalidate: 60, tags: ["products"] },
        cache: "force-cache",
      })
      .catch(buildSafe({ products: [] as HttpTypes.StoreProduct[], count: 0 }))
    out.push(...res.products)
    if (out.length >= res.count || !res.products.length) break
  }
  return out
})

export const getProductCards = cache(async (): Promise<ProductCardData[]> => (await getAllProducts()).map(toCard))

export const getProductByHandle = cache(async (handle: string): Promise<HttpTypes.StoreProduct | null> => {
  const region = await getRegion()
  const { products } = await sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[] }>("/store/products", {
      query: { handle, limit: 1, fields: PRODUCT_FIELDS, ...(region ? { region_id: region.id } : {}) },
      next: { revalidate: 60, tags: ["products", `product-${handle}`] },
      cache: "force-cache",
    })
    .catch(buildSafe({ products: [] as HttpTypes.StoreProduct[] }))
  return products[0] ?? null
})

export async function getProductsByIds(ids: string[]): Promise<ProductCardData[]> {
  if (!ids.length) return []
  const all = await getProductCards()
  const byId = new Map(all.map((p) => [p.id, p]))
  return ids.map((id) => byId.get(id)).filter(Boolean) as ProductCardData[]
}

export async function getRelatedProducts(product: HttpTypes.StoreProduct, limit = 4): Promise<ProductCardData[]> {
  const all = await getProductCards()
  const cats = new Set(((product as any).categories ?? []).map((c: any) => c.id))
  const scored = all
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      p,
      score:
        (p.collection?.handle && p.collection.handle === product.collection?.handle ? 2 : 0) +
        p.categories.filter((c) => cats.has(c.id)).length * 3 +
        (p.inStock ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.p)
}

export const getCollections = cache(async () => {
  const { collections } = await sdk.client
    .fetch<{ collections: HttpTypes.StoreCollection[] }>("/store/collections", {
      query: { limit: 100, fields: "id,handle,title,metadata" },
      next: { revalidate: 300, tags: ["collections"] },
      cache: "force-cache",
    })
    .catch(buildSafe({ collections: [] as HttpTypes.StoreCollection[] }))
  return collections
})

export const getCategories = cache(async () => {
  const { product_categories } = await sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>("/store/product-categories", {
      query: { limit: 200, fields: "id,handle,name,description,parent_category_id,rank" },
      next: { revalidate: 300, tags: ["categories"] },
      cache: "force-cache",
    })
    .catch(buildSafe({ product_categories: [] as HttpTypes.StoreProductCategory[] }))
  return product_categories
})
