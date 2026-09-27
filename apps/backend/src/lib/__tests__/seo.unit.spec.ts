import { generateListingSeo, generateProductSeo, slugify, stripHtml, truncate, META_DESCRIPTION_MAX, META_TITLE_MAX } from "../seo/generate"

describe("seo generation", () => {
  it("slugifies Romanian titles to ASCII", () => {
    expect(slugify("Pantaloni scurți Țesătură Ușoară & Bumbac")).toBe("pantaloni-scurti-tesatura-usoara-si-bumbac")
    expect(slugify("  --Hanorac   Vintage--  ")).toBe("hanorac-vintage")
  })

  it("strips HTML and truncates on word boundaries", () => {
    expect(stripHtml("<p>Salut <strong>lume</strong>&nbsp;!</p>")).toBe("Salut lume !")
    const t = truncate("unu doi trei patru cinci sase sapte", 20)
    expect(t.length).toBeLessThanOrEqual(20)
    expect(t.endsWith("…")).toBe(true)
  })

  it("derives complete product SEO within length limits", () => {
    const seo = generateProductSeo(
      {
        title: "Tricou Essential",
        description: "<p>Tricoul pe care îl porți cel mai des. Bumbac organic de 220 g/m², guler dublu care își păstrează forma.</p>",
        handle: "tricou-essential",
        images: [{ id: "img1", url: "https://cdn/a.png" }, { id: "img2", url: "https://cdn/b.png" }],
        collection: { title: "Esențiale" },
        options: [{ title: "Culoare", values: [{ value: "Negru" }] }],
        variants: [{ sku: "OH-1", barcode: null }],
      },
      { product_title_template: "{title} – {collection}", product_description_template: "{title}: {excerpt} Livrare rapidă în toată România, retur 30 de zile." }
    )
    expect(seo.meta_title).toBe("Tricou Essential – Esențiale")
    expect(seo.meta_title.length).toBeLessThanOrEqual(META_TITLE_MAX)
    expect(seo.meta_description.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX)
    expect(seo.meta_description).toMatch(/^Tricou Essential: Tricoul/)
    expect(seo.meta_description).toMatch(/retur 30 de zile\.$/)
    expect((seo.meta_description.match(/…/g) ?? []).length).toBeLessThanOrEqual(1)
    expect(seo.canonical_path).toBe("/products/tricou-essential")
    expect(seo.og_image).toBe("https://cdn/a.png")
    expect(seo.image_alts).toEqual({ img1: "Tricou Essential – Negru", img2: "Tricou Essential – Negru – imagine 2" })
    expect(seo.issues).toContain("missing_gtin")
  })

  it("flags missing content", () => {
    const seo = generateProductSeo({ title: "X", handle: "x", variants: [{}] })
    expect(seo.issues).toEqual(expect.arrayContaining(["missing_description", "missing_images", "missing_gtin", "missing_sku"]))
  })

  it("generates listing SEO with fallback description", () => {
    const s = generateListingSeo({ title: "Tricouri", handle: "tricouri", kind: "category" })
    expect(s.canonical_path).toBe("/categories/tricouri")
    expect(s.meta_description).toContain("tricouri")
    expect(s.issues).toContain("missing_description")
  })
})
