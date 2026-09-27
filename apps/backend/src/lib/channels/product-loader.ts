import { ContainerRegistrationKeys, Modules, QueryContext, getVariantAvailability } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

export type ChannelVariant = {
  id: string
  title: string
  sku: string | null
  gtin: string | null
  options: Record<string, string>
  color: string | null
  size: string | null
  price: number | null
  original_price: number | null
  currency_code: string
  quantity: number | null
  manage_inventory: boolean
  allow_backorder: boolean
  in_stock: boolean
}

export type ChannelProduct = {
  id: string
  handle: string
  title: string
  description: string
  status: string
  url: string
  images: string[]
  brand: string
  material: string | null
  collection: string | null
  categories: string[]
  type: string | null
  variants: ChannelVariant[]
  published_in_store: boolean
}

const COLOR_RX = /culoare|color|colour/i
const SIZE_RX = /mărime|marime|size|măsură/i

export function storefrontUrl() {
  return (process.env.STOREFRONT_URL || "http://localhost:3000").replace(/\/$/, "")
}

export function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//.test(url)) return url
  const base = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  return `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`
}

/**
 * Loads everything the external channels need about a product: prices
 * (calculated in the default region, so price-list sales become sale prices),
 * stock availability in the storefront sales channel, options, media.
 */
export async function loadChannelProduct(
  container: MedusaContainer,
  productId: string,
  opts: { brand?: string } = {}
): Promise<ChannelProduct | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const regionModule = container.resolve(Modules.REGION)
  const storeModule = container.resolve(Modules.STORE)

  const [store] = await storeModule.listStores({}, { relations: ["supported_currencies"] })
  const currency =
    store?.supported_currencies?.find((c: any) => c.is_default)?.currency_code ?? "ron"
  const [region] = await regionModule.listRegions({ currency_code: currency }, { take: 1 })
  const salesChannelId = store?.default_sales_channel_id

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "title",
      "subtitle",
      "description",
      "status",
      "thumbnail",
      "material",
      "images.url",
      "images.rank",
      "collection.title",
      "categories.name",
      "type.value",
      "sales_channels.id",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.barcode",
      "variants.ean",
      "variants.upc",
      "variants.manage_inventory",
      "variants.allow_backorder",
      "variants.options.value",
      "variants.options.option.title",
      "variants.calculated_price.*",
    ],
    filters: { id: productId },
    context: region
      ? { variants: { calculated_price: QueryContext({ region_id: region.id, currency_code: currency }) } }
      : undefined,
  })
  const p: any = data[0]
  if (!p) return null

  const variantIds = (p.variants ?? []).map((v: any) => v.id)
  const availability =
    salesChannelId && variantIds.length
      ? await getVariantAvailability(query, { variant_ids: variantIds, sales_channel_id: salesChannelId })
      : {}

  const images = [...(p.images ?? [])]
    .sort((a: any, b: any) => (a.rank ?? 0) - (b.rank ?? 0))
    .map((i: any) => absoluteUrl(i.url))
    .filter(Boolean) as string[]
  if (!images.length && p.thumbnail) images.push(absoluteUrl(p.thumbnail)!)

  const variants: ChannelVariant[] = (p.variants ?? []).map((v: any) => {
    const options: Record<string, string> = {}
    for (const o of v.options ?? []) {
      if (o?.option?.title) options[o.option.title] = o.value
    }
    const colorKey = Object.keys(options).find((k) => COLOR_RX.test(k))
    const sizeKey = Object.keys(options).find((k) => SIZE_RX.test(k))
    const cp = v.calculated_price
    const price = cp?.calculated_amount != null ? Number(cp.calculated_amount) : null
    const original = cp?.original_amount != null ? Number(cp.original_amount) : price
    const qty = v.manage_inventory ? (availability[v.id]?.availability ?? 0) : null
    return {
      id: v.id,
      title: v.title,
      sku: v.sku ?? null,
      gtin: v.barcode || v.ean || v.upc || null,
      options,
      color: colorKey ? options[colorKey] : null,
      size: sizeKey ? options[sizeKey] : null,
      price,
      original_price: original,
      currency_code: (cp?.currency_code ?? currency).toUpperCase(),
      quantity: qty,
      manage_inventory: !!v.manage_inventory,
      allow_backorder: !!v.allow_backorder,
      in_stock: !v.manage_inventory || v.allow_backorder || (qty ?? 0) > 0,
    }
  })

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description || p.subtitle || p.title,
    status: p.status,
    url: `${storefrontUrl()}/products/${p.handle}`,
    images,
    brand: opts.brand || "OutfitHub",
    material: p.material ?? null,
    collection: p.collection?.title ?? null,
    categories: (p.categories ?? []).map((c: any) => c.name),
    type: p.type?.value ?? null,
    variants,
    published_in_store:
      p.status === "published" &&
      (!salesChannelId || (p.sales_channels ?? []).some((s: any) => s.id === salesChannelId)),
  }
}
