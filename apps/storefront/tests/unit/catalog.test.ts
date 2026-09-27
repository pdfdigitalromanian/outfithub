import { describe, expect, it } from "vitest"
import { applyFilters, computeFacets, filtersToQuery, paginate, parseFilters, sortSizes, toCard, type ProductCardData } from "@/lib/catalog"

const card = (over: Partial<ProductCardData>): ProductCardData => ({
  id: "p",
  handle: "p",
  title: "Produs",
  subtitle: null,
  thumbnail: null,
  hoverImage: null,
  price: 100,
  originalPrice: 100,
  currency: "ron",
  priceVaries: false,
  colors: [],
  sizes: [],
  availableSizes: [],
  inStock: true,
  isNew: false,
  collection: null,
  categories: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
})

const cards = [
  card({ id: "a", title: "Tricou Essential", price: 129, colors: ["Negru", "Alb"], sizes: ["S", "M"], availableSizes: ["M"], categories: [{ id: "c1", handle: "tricouri", name: "Tricouri" }], createdAt: "2026-02-01T00:00:00Z" }),
  card({ id: "b", title: "Hanorac Vintage", price: 289, originalPrice: 349, colors: ["Grafit"], sizes: ["L"], availableSizes: ["L"], categories: [{ id: "c2", handle: "hanorace", name: "Hanorace" }], createdAt: "2026-03-01T00:00:00Z" }),
  card({ id: "c", title: "Pantaloni scurți", price: 169, inStock: false, sizes: ["XL"], availableSizes: [], categories: [{ id: "c3", handle: "pantaloni", name: "Pantaloni" }], createdAt: "2026-04-01T00:00:00Z" }),
]

describe("catalog filters", () => {
  it("parses and serializes filters symmetrically", () => {
    const f = parseFilters({ category: "tricouri,hanorace", size: "M", min: "100", sort: "price-asc", page: "2" })
    expect(f.category).toEqual(["tricouri", "hanorace"])
    expect(f.minPrice).toBe(100)
    expect(filtersToQuery(f)).toBe("?category=tricouri%2Chanorace&size=M&min=100&sort=price-asc&page=2")
  })

  it("rejects unknown sort values", () => {
    expect(parseFilters({ sort: "drop table" }).sort).toBe("recommended")
  })

  it("searches diacritic-insensitively", () => {
    expect(applyFilters(cards, { q: "scurti" }).map((c) => c.id)).toEqual(["c"])
  })

  it("filters by category, available size and sale", () => {
    expect(applyFilters(cards, { category: ["tricouri"] }).map((c) => c.id)).toEqual(["a"])
    expect(applyFilters(cards, { size: ["S"] })).toHaveLength(0) // S is sold out
    expect(applyFilters(cards, { onSale: true }).map((c) => c.id)).toEqual(["b"])
    expect(applyFilters(cards, { inStock: true }).map((c) => c.id)).not.toContain("c")
  })

  it("sorts by price and puts sold-out items last by default", () => {
    expect(applyFilters(cards, { sort: "price-asc" }).map((c) => c.id)).toEqual(["a", "c", "b"])
    expect(applyFilters(cards, { sort: "recommended" }).at(-1)!.id).toBe("c")
  })

  it("computes facets and price range", () => {
    const f = computeFacets(cards)
    expect(f.categories.map((c) => c.handle)).toEqual(["hanorace", "pantaloni", "tricouri"])
    expect(f.priceRange).toEqual({ min: 129, max: 289 })
    expect(f.sizes.map((s) => s.value)).toEqual(["S", "M", "L", "XL"])
  })

  it("paginates cumulatively (load more)", () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    expect(paginate(items, 2, 24)).toMatchObject({ page: 2, pages: 3, total: 50 })
    expect(paginate(items, 2, 24).items).toHaveLength(48)
  })

  it("sorts apparel sizes naturally", () => {
    expect(sortSizes(["XL", "S", "42", "M", "38", "XXS"])).toEqual(["XXS", "S", "M", "XL", "38", "42"])
  })
})

describe("toCard", () => {
  it("derives price, colors, sizes and stock from Medusa variants", () => {
    const product: any = {
      id: "prod_1",
      handle: "tricou",
      title: "Tricou",
      thumbnail: "a.png",
      images: [{ url: "a.png" }, { url: "b.png" }],
      options: [{ title: "Culoare" }, { title: "Mărime" }],
      variants: [
        { id: "v1", manage_inventory: true, inventory_quantity: 0, options: [{ value: "Negru", option: { title: "Culoare" } }, { value: "S", option: { title: "Mărime" } }], calculated_price: { calculated_amount: 99, original_amount: 129, currency_code: "ron" } },
        { id: "v2", manage_inventory: true, inventory_quantity: 3, options: [{ value: "Negru", option: { title: "Culoare" } }, { value: "M", option: { title: "Mărime" } }], calculated_price: { calculated_amount: 129, original_amount: 129, currency_code: "ron" } },
      ],
      created_at: "2026-01-01T00:00:00Z",
    }
    const c = toCard(product)
    expect(c.price).toBe(99)
    expect(c.originalPrice).toBe(129)
    expect(c.priceVaries).toBe(true)
    expect(c.colors).toEqual(["Negru"])
    expect(c.sizes).toEqual(["S", "M"])
    expect(c.availableSizes).toEqual(["M"])
    expect(c.hoverImage).toBe("b.png")
    expect(c.inStock).toBe(true)
  })
})
