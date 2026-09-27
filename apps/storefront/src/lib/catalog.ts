import type { HttpTypes } from "@medusajs/types"

/**
 * Pure catalog helpers (no server imports) shared by server components, client
 * components and unit tests.
 */
export const COLOR_RX = /culoare|color|colour/i
export const SIZE_RX = /mărime|marime|size|măsură/i

export const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"]

export function sortSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase())
    const ib = SIZE_ORDER.indexOf(b.toUpperCase())
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    const na = parseFloat(a)
    const nb = parseFloat(b)
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return a.localeCompare(b, "ro")
  })
}

/** Named colors → swatch hex (extend as the catalog grows). */
export const COLOR_SWATCHES: Record<string, string> = {
  negru: "#141414",
  alb: "#F7F6F2",
  grafit: "#3C3F45",
  gri: "#9B9B98",
  "gri melanj": "#A7A7A3",
  bej: "#D8C8AE",
  crem: "#EFE6D2",
  maro: "#6B4A34",
  bleumarin: "#1F2A44",
  albastru: "#3A5A8C",
  verde: "#4E5D46",
  olive: "#6B6B3F",
  rosu: "#9C2F2A",
  roșu: "#9C2F2A",
  roz: "#E3B7B5",
  galben: "#E4C35A",
  kaki: "#8A8358",
}

export const swatchFor = (name: string) => COLOR_SWATCHES[name.trim().toLowerCase()] ?? "#CFCAC2"

export type VariantInfo = {
  id: string
  title: string
  sku: string | null
  options: Record<string, string>
  price: number | null
  originalPrice: number | null
  currency: string
  inStock: boolean
  quantity: number | null
}

export type ProductCardData = {
  id: string
  handle: string
  title: string
  subtitle: string | null
  thumbnail: string | null
  hoverImage: string | null
  price: number | null
  originalPrice: number | null
  currency: string
  priceVaries: boolean
  colors: string[]
  sizes: string[]
  availableSizes: string[]
  inStock: boolean
  isNew: boolean
  collection: { handle: string; title: string } | null
  categories: { id: string; handle: string; name: string }[]
  createdAt: string
}

export function variantInfo(v: HttpTypes.StoreProductVariant): VariantInfo {
  const options: Record<string, string> = {}
  for (const o of v.options ?? []) {
    const title = (o as any).option?.title
    if (title) options[title] = o.value
  }
  const cp = v.calculated_price
  const qty = typeof v.inventory_quantity === "number" ? v.inventory_quantity : null
  return {
    id: v.id,
    title: v.title ?? "",
    sku: v.sku ?? null,
    options,
    price: cp?.calculated_amount ?? null,
    originalPrice: cp?.original_amount ?? null,
    currency: cp?.currency_code ?? "ron",
    inStock: !v.manage_inventory || !!v.allow_backorder || (qty ?? 0) > 0,
    quantity: v.manage_inventory ? qty : null,
  }
}

export function toCard(p: HttpTypes.StoreProduct): ProductCardData {
  const variants = (p.variants ?? []).map(variantInfo)
  const priced = variants.filter((v) => v.price != null)
  const cheapest = priced.sort((a, b) => a.price! - b.price!)[0]
  const colorKey = p.options?.find((o) => COLOR_RX.test(o.title ?? ""))?.title
  const sizeKey = p.options?.find((o) => SIZE_RX.test(o.title ?? ""))?.title
  const colors = colorKey ? [...new Set(variants.map((v) => v.options[colorKey]).filter(Boolean))] : []
  const sizes = sizeKey ? sortSizes([...new Set(variants.map((v) => v.options[sizeKey]).filter(Boolean))]) : []
  const availableSizes = sizeKey
    ? sortSizes([...new Set(variants.filter((v) => v.inStock).map((v) => v.options[sizeKey]).filter(Boolean))])
    : []
  const images = (p.images ?? []).map((i) => i.url)
  const thumb = p.thumbnail ?? images[0] ?? null
  return {
    id: p.id,
    handle: p.handle ?? "",
    title: p.title ?? "",
    subtitle: p.subtitle ?? null,
    thumbnail: thumb,
    hoverImage: images.find((u) => u !== thumb) ?? null,
    price: cheapest?.price ?? null,
    originalPrice: cheapest?.originalPrice ?? null,
    currency: cheapest?.currency ?? "ron",
    priceVaries: new Set(priced.map((v) => v.price)).size > 1,
    colors,
    sizes,
    availableSizes,
    inStock: variants.some((v) => v.inStock),
    isNew: !!p.created_at && Date.now() - new Date(p.created_at as unknown as string).getTime() < 1000 * 60 * 60 * 24 * 30,
    collection: p.collection ? { handle: p.collection.handle ?? "", title: p.collection.title ?? "" } : null,
    categories: ((p as any).categories ?? []).map((c: any) => ({ id: c.id, handle: c.handle, name: c.name })),
    createdAt: (p.created_at as unknown as string) ?? "",
  }
}

export type SortKey = "recommended" | "newest" | "price-asc" | "price-desc"

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recomandate" },
  { value: "newest", label: "Cele mai noi" },
  { value: "price-asc", label: "Preț crescător" },
  { value: "price-desc", label: "Preț descrescător" },
]

export type CatalogFilters = {
  q?: string
  category?: string[]
  collection?: string[]
  size?: string[]
  color?: string[]
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  onSale?: boolean
  sort?: SortKey
  page?: number
}

export const PAGE_SIZE = 24

/** Parses Next.js searchParams into typed filters. */
export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const list = (k: string) => {
    const v = sp[k]
    const arr = Array.isArray(v) ? v : v ? v.split(",") : []
    return arr.map((s) => s.trim()).filter(Boolean).slice(0, 20)
  }
  const num = (k: string) => {
    const v = Number(Array.isArray(sp[k]) ? sp[k]![0] : sp[k])
    return Number.isFinite(v) && v >= 0 ? v : undefined
  }
  const sort = String(sp.sort ?? "recommended") as SortKey
  return {
    q: typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined,
    category: list("category"),
    collection: list("collection"),
    size: list("size"),
    color: list("color"),
    minPrice: num("min"),
    maxPrice: num("max"),
    inStock: sp.stock === "1",
    onSale: sp.sale === "1",
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : "recommended",
    page: Math.max(1, Math.floor(num("page") ?? 1)),
  }
}

export type Facets = {
  categories: { handle: string; name: string; count: number }[]
  collections: { handle: string; title: string; count: number }[]
  sizes: { value: string; count: number }[]
  colors: { value: string; count: number }[]
  priceRange: { min: number; max: number }
}

export function computeFacets(cards: ProductCardData[]): Facets {
  const cat = new Map<string, { name: string; count: number }>()
  const col = new Map<string, { title: string; count: number }>()
  const size = new Map<string, number>()
  const color = new Map<string, number>()
  let min = Infinity
  let max = 0
  for (const c of cards) {
    for (const k of c.categories) cat.set(k.handle, { name: k.name, count: (cat.get(k.handle)?.count ?? 0) + 1 })
    if (c.collection) col.set(c.collection.handle, { title: c.collection.title, count: (col.get(c.collection.handle)?.count ?? 0) + 1 })
    for (const s of c.sizes) size.set(s, (size.get(s) ?? 0) + 1)
    for (const s of c.colors) color.set(s, (color.get(s) ?? 0) + 1)
    if (c.price != null) {
      min = Math.min(min, c.price)
      max = Math.max(max, c.price)
    }
  }
  return {
    categories: [...cat].map(([handle, v]) => ({ handle, ...v })).sort((a, b) => a.name.localeCompare(b.name, "ro")),
    collections: [...col].map(([handle, v]) => ({ handle, ...v })).sort((a, b) => a.title.localeCompare(b.title, "ro")),
    sizes: sortSizes([...size.keys()]).map((value) => ({ value, count: size.get(value)! })),
    colors: [...color].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, "ro")),
    priceRange: { min: min === Infinity ? 0 : Math.floor(min), max: Math.ceil(max) },
  }
}

const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

export function applyFilters(cards: ProductCardData[], f: CatalogFilters): ProductCardData[] {
  let out = cards
  if (f.q) {
    const terms = normalize(f.q).split(/\s+/).filter(Boolean)
    out = out.filter((c) => {
      const hay = normalize(
        [c.title, c.subtitle, c.collection?.title, ...c.categories.map((x) => x.name), ...c.colors].filter(Boolean).join(" ")
      )
      return terms.every((t) => hay.includes(t))
    })
  }
  if (f.category?.length) out = out.filter((c) => c.categories.some((k) => f.category!.includes(k.handle)))
  if (f.collection?.length) out = out.filter((c) => c.collection && f.collection!.includes(c.collection.handle))
  if (f.size?.length) out = out.filter((c) => c.availableSizes.some((s) => f.size!.includes(s)))
  if (f.color?.length) out = out.filter((c) => c.colors.some((s) => f.color!.includes(s)))
  if (f.minPrice != null) out = out.filter((c) => (c.price ?? 0) >= f.minPrice!)
  if (f.maxPrice != null) out = out.filter((c) => (c.price ?? 0) <= f.maxPrice!)
  if (f.inStock) out = out.filter((c) => c.inStock)
  if (f.onSale) out = out.filter((c) => c.originalPrice != null && c.price != null && c.price < c.originalPrice)

  const sorted = [...out]
  switch (f.sort) {
    case "newest":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      break
    case "price-asc":
      sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
      break
    case "price-desc":
      sorted.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity))
      break
    default:
      // In-stock first, then newest.
      sorted.sort((a, b) => Number(b.inStock) - Number(a.inStock) || b.createdAt.localeCompare(a.createdAt))
  }
  return sorted
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), pages)
  return { items: items.slice(0, current * size), page: current, pages, total: items.length }
}

/** Serializes filters back to a query string (used by filter UI links). */
export function filtersToQuery(f: CatalogFilters): string {
  const p = new URLSearchParams()
  if (f.q) p.set("q", f.q)
  if (f.category?.length) p.set("category", f.category.join(","))
  if (f.collection?.length) p.set("collection", f.collection.join(","))
  if (f.size?.length) p.set("size", f.size.join(","))
  if (f.color?.length) p.set("color", f.color.join(","))
  if (f.minPrice != null) p.set("min", String(f.minPrice))
  if (f.maxPrice != null) p.set("max", String(f.maxPrice))
  if (f.inStock) p.set("stock", "1")
  if (f.onSale) p.set("sale", "1")
  if (f.sort && f.sort !== "recommended") p.set("sort", f.sort)
  if (f.page && f.page > 1) p.set("page", String(f.page))
  const s = p.toString()
  return s ? `?${s}` : ""
}
