import { stripHtml, truncate } from "../seo/generate"
import type { ChannelProduct, ChannelVariant } from "./product-loader"
import type { MerchantProductInput } from "../providers/google-merchant"
import { toMicros } from "../providers/google-merchant"
import type { MetaCatalogItem } from "../providers/meta"
import type { TikTokShopProductBody } from "../providers/tiktok-shop"

/** Stable external offer ID per variant: SKU when present, otherwise the Medusa variant ID. */
export const offerIdFor = (v: ChannelVariant) => (v.sku && /^[\w.\-]{1,50}$/.test(v.sku) ? v.sku : v.id)

function variantUrl(p: ChannelProduct, v: ChannelVariant) {
  return p.variants.length > 1 ? `${p.url}?variant=${encodeURIComponent(v.id)}` : p.url
}

export function toGoogleProductInputs(
  p: ChannelProduct,
  cfg: { content_language: string; feed_label: string; default_brand?: string; google_product_category?: string }
): MerchantProductInput[] {
  const description = truncate(stripHtml(p.description), 5000)
  return p.variants.map((v) => {
    const onSale = v.original_price != null && v.price != null && v.price < v.original_price
    return {
      offerId: offerIdFor(v),
      contentLanguage: cfg.content_language,
      feedLabel: cfg.feed_label,
      productAttributes: {
        title: truncate([p.title, v.color, v.size].filter(Boolean).join(" – "), 150),
        description,
        link: variantUrl(p, v),
        imageLink: p.images[0],
        additionalImageLinks: p.images.slice(1, 11),
        availability: v.in_stock ? "IN_STOCK" : "OUT_OF_STOCK",
        condition: "NEW",
        price: { amountMicros: toMicros(onSale ? v.original_price! : v.price ?? 0), currencyCode: v.currency_code },
        ...(onSale ? { salePrice: { amountMicros: toMicros(v.price!), currencyCode: v.currency_code } } : {}),
        brand: cfg.default_brand || p.brand,
        ...(v.gtin ? { gtins: [v.gtin] } : { identifierExists: false, mpn: v.sku ?? undefined }),
        ...(p.variants.length > 1 ? { itemGroupId: p.id } : {}),
        ...(v.color ? { color: v.color } : {}),
        ...(v.size ? { size: v.size, sizeSystem: "EU" } : {}),
        ...(p.material ? { material: p.material } : {}),
        ...(cfg.google_product_category ? { googleProductCategory: cfg.google_product_category } : {}),
        productTypes: [[p.collection, ...p.categories].filter(Boolean).join(" > ")].filter(Boolean),
      },
    }
  })
}

const formatMetaPrice = (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`

export function toMetaItems(p: ChannelProduct, brand?: string): MetaCatalogItem[] {
  const description = truncate(stripHtml(p.description), 9999)
  return p.variants.map((v) => {
    const onSale = v.original_price != null && v.price != null && v.price < v.original_price
    return {
      id: offerIdFor(v),
      item_group_id: p.id,
      title: truncate([p.title, v.color, v.size].filter(Boolean).join(" – "), 200),
      description,
      availability: v.in_stock ? "in stock" : "out of stock",
      condition: "new",
      price: formatMetaPrice(onSale ? v.original_price! : v.price ?? 0, v.currency_code),
      ...(onSale ? { sale_price: formatMetaPrice(v.price!, v.currency_code) } : {}),
      link: variantUrl(p, v),
      image_link: p.images[0],
      additional_image_link: p.images.slice(1, 11),
      brand: brand || p.brand,
      ...(v.color ? { color: v.color } : {}),
      ...(v.size ? { size: v.size } : {}),
      ...(v.gtin ? { gtin: v.gtin } : {}),
      ...(v.quantity != null ? { inventory: Math.max(0, v.quantity) } : {}),
    }
  })
}

export function toTikTokShopProduct(
  p: ChannelProduct,
  cfg: { category_id: string; warehouse_id: string; brand_id?: string; package_weight_kg?: number },
  imageUris: string[]
): TikTokShopProductBody {
  const html = p.description.includes("<") ? p.description : `<p>${stripHtml(p.description)}</p>`
  return {
    title: truncate(p.title, 255),
    description: html,
    category_id: cfg.category_id,
    ...(cfg.brand_id ? { brand_id: cfg.brand_id } : {}),
    main_images: imageUris.slice(0, 9).map((uri) => ({ uri })),
    skus: p.variants.map((v) => ({
      seller_sku: offerIdFor(v),
      price: { amount: (v.price ?? 0).toFixed(2), currency: v.currency_code },
      inventory: [{ warehouse_id: cfg.warehouse_id, quantity: Math.max(0, v.quantity ?? 999) }],
      sales_attributes: Object.entries(v.options).map(([name, value_name]) => ({ name, value_name })),
      ...(v.gtin ? { identifier_code: { code: v.gtin, type: "GTIN" as const } } : {}),
    })),
    package_weight: { value: String(cfg.package_weight_kg ?? 0.5), unit: "KILOGRAM" },
  }
}
