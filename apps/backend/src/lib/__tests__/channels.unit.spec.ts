import { toGoogleProductInputs, toMetaItems, toTikTokShopProduct, offerIdFor } from "../channels/mappers"
import { validateChannelProduct, hasBlockingIssues } from "../channels/validate"
import type { ChannelProduct } from "../channels/product-loader"

const product: ChannelProduct = {
  id: "prod_1",
  handle: "tricou",
  title: "Tricou Essential",
  description: "<p>Bumbac organic de 220 g/m², croială dreaptă.</p>",
  status: "published",
  url: "https://shop.ro/products/tricou",
  images: ["https://cdn/a.png", "https://cdn/b.png"],
  brand: "OutfitHub",
  material: "Bumbac",
  collection: "Esențiale",
  categories: ["Tricouri"],
  type: null,
  published_in_store: true,
  variants: [
    { id: "v1", title: "Negru / M", sku: "OH-TEE-BLK-M", gtin: "5941234567890", options: { Culoare: "Negru", Mărime: "M" }, color: "Negru", size: "M", price: 99, original_price: 129, currency_code: "RON", quantity: 5, manage_inventory: true, allow_backorder: false, in_stock: true },
    { id: "v2", title: "Negru / L", sku: null, gtin: null, options: { Culoare: "Negru", Mărime: "L" }, color: "Negru", size: "L", price: 129, original_price: 129, currency_code: "RON", quantity: 0, manage_inventory: true, allow_backorder: false, in_stock: false },
  ],
}

describe("channel mappers", () => {
  it("maps variants to Merchant API product inputs with sale price and identifiers", () => {
    const [a, b] = toGoogleProductInputs(product, { content_language: "ro", feed_label: "RO", google_product_category: "1604" })
    expect(a.offerId).toBe("OH-TEE-BLK-M")
    expect(a.productAttributes.price).toEqual({ amountMicros: "129000000", currencyCode: "RON" })
    expect(a.productAttributes.salePrice).toEqual({ amountMicros: "99000000", currencyCode: "RON" })
    expect(a.productAttributes.gtins).toEqual(["5941234567890"])
    expect(a.productAttributes.itemGroupId).toBe("prod_1")
    expect(a.productAttributes.availability).toBe("IN_STOCK")
    expect(a.productAttributes.description).not.toContain("<p>")
    expect(b.offerId).toBe("v2")
    expect(b.productAttributes.identifierExists).toBe(false)
    expect(b.productAttributes.availability).toBe("OUT_OF_STOCK")
  })

  it("maps Meta catalog items", () => {
    const [a] = toMetaItems(product)
    expect(a).toMatchObject({ id: "OH-TEE-BLK-M", item_group_id: "prod_1", price: "129.00 RON", sale_price: "99.00 RON", availability: "in stock", inventory: 5 })
  })

  it("maps TikTok Shop products with sales attributes", () => {
    const body = toTikTokShopProduct(product, { category_id: "601226", warehouse_id: "W1" }, ["uri1"])
    expect(body.skus[0].sales_attributes).toEqual([{ name: "Culoare", value_name: "Negru" }, { name: "Mărime", value_name: "M" }])
    expect(body.skus[0].identifier_code).toEqual({ code: "5941234567890", type: "GTIN" })
    expect(body.main_images).toEqual([{ uri: "uri1" }])
  })

  it("uses the variant id when the SKU is not a valid offer id", () => {
    expect(offerIdFor({ ...product.variants[0], sku: "has space" })).toBe("v1")
  })

  it("validates channel requirements", () => {
    expect(hasBlockingIssues(validateChannelProduct(product, "google_merchant"))).toBe(false)
    expect(hasBlockingIssues(validateChannelProduct(product, "tiktok_shop"))).toBe(true) // missing SKU
    expect(hasBlockingIssues(validateChannelProduct({ ...product, images: [] }, "meta"))).toBe(true)
  })
})
