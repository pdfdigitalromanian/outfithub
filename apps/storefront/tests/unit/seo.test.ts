import { describe, expect, it } from "vitest"
import { breadcrumbJsonLd, jsonLdString, pageMetadata, productJsonLd } from "@/lib/seo"

describe("seo helpers", () => {
  it("escapes < in JSON-LD to prevent script injection", () => {
    expect(jsonLdString({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>")
  })

  it("builds canonical and OG metadata", () => {
    const m = pageMetadata({ title: "Tricou", description: "Desc", path: "/products/tricou", image: "https://cdn/x.png", noindex: true })
    expect(m.alternates?.canonical).toMatch(/\/products\/tricou$/)
    expect(m.robots).toEqual({ index: false, follow: true })
    expect((m.openGraph as any).images[0].url).toBe("https://cdn/x.png")
  })

  it("emits a ProductGroup with one Offer per variant", () => {
    const p: any = {
      id: "prod_1",
      title: "Tricou",
      images: [{ url: "https://cdn/a.png" }],
      options: [{ title: "Culoare" }, { title: "Mărime" }],
      variants: [
        { id: "v1", sku: "T-BLK-S", barcode: "5941234567890", manage_inventory: true, inventory_quantity: 2, options: [{ value: "Negru", option: { title: "Culoare" } }, { value: "S", option: { title: "Mărime" } }], calculated_price: { calculated_amount: 129, original_amount: 129, currency_code: "ron" } },
        { id: "v2", sku: "T-BLK-M", manage_inventory: true, inventory_quantity: 0, options: [{ value: "Negru", option: { title: "Culoare" } }, { value: "M", option: { title: "Mărime" } }], calculated_price: { calculated_amount: 129, original_amount: 129, currency_code: "ron" } },
      ],
    }
    const ld: any = productJsonLd(p, { brand: "OutfitHub", url: "https://shop.ro/products/tricou", description: "d" })
    expect(ld["@type"]).toBe("ProductGroup")
    expect(ld.variesBy).toEqual(["https://schema.org/color", "https://schema.org/size"])
    expect(ld.hasVariant).toHaveLength(2)
    expect(ld.hasVariant[0].gtin).toBe("5941234567890")
    expect(ld.hasVariant[0].offers.price).toBe("129.00")
    expect(ld.hasVariant[0].offers.priceCurrency).toBe("RON")
    expect(ld.hasVariant[1].offers.availability).toBe("https://schema.org/OutOfStock")
  })

  it("numbers breadcrumb positions", () => {
    const b: any = breadcrumbJsonLd([{ name: "Acasă", path: "/" }, { name: "Magazin", path: "/shop" }])
    expect(b.itemListElement.map((i: any) => i.position)).toEqual([1, 2])
  })
})
