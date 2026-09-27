/**
 * Pure SEO derivation helpers shared by the product subscriber, the admin
 * "regenerate" action and unit tests.
 */
const DIACRITICS: Record<string, string> = {
  ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t",
  Ă: "a", Â: "a", Î: "i", Ș: "s", Ş: "s", Ț: "t", Ţ: "t",
}

export function slugify(input: string): string {
  return input
    .replace(/[ăâîșşțţĂÂÎȘŞȚŢ]/g, (c) => DIACRITICS[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " si ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 96)
    .replace(/-+$/, "")
}

export function stripHtml(input: string | null | undefined): string {
  return (input ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[*_#>`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Cuts text on a word boundary and appends an ellipsis when truncated. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "") + "…"
}

function fill(template: string, vars: Record<string, string | undefined>): string {
  return template
    .replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "")
    .replace(/\s+[–-]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

export type SeoProductInput = {
  title: string
  subtitle?: string | null
  description?: string | null
  handle: string
  thumbnail?: string | null
  images?: { id?: string; url: string }[]
  collection?: { title: string } | null
  categories?: { name: string }[]
  options?: { title: string; values?: { value: string }[] }[]
  variants?: { sku?: string | null; barcode?: string | null; ean?: string | null; upc?: string | null }[]
}

export type SeoTemplates = {
  product_title_template?: string
  product_description_template?: string
}

export type GeneratedSeo = {
  meta_title: string
  meta_description: string
  og_image: string | null
  canonical_path: string
  image_alts: Record<string, string>
  noindex: boolean
  issues: string[]
}

export const META_TITLE_MAX = 60
export const META_DESCRIPTION_MAX = 155

export function generateProductSeo(p: SeoProductInput, templates: SeoTemplates = {}): GeneratedSeo {
  const issues: string[] = []
  const collection = p.collection?.title ?? p.categories?.[0]?.name
  const plain = stripHtml(p.description)

  let meta_title = fill(templates.product_title_template || "{title} – {collection}", {
    title: p.title,
    collection,
  })
  if (meta_title.length > META_TITLE_MAX) meta_title = truncate(p.title, META_TITLE_MAX)

  // Fit the excerpt into the template so the final text stays within the
  // limit without truncating the (usually important) suffix.
  const descTemplate = templates.product_description_template || "{title}: {excerpt} Livrare rapidă în toată România."
  const withoutExcerpt = fill(descTemplate, { title: p.title, excerpt: "" })
  const budget = Math.max(40, META_DESCRIPTION_MAX - withoutExcerpt.length - 1)
  let fitted = truncate(plain || p.subtitle || "", budget)
  if (fitted && !/[.!?…]$/.test(fitted)) fitted += "."
  let meta_description = fill(descTemplate, { title: p.title, excerpt: fitted }).replace(/:\s*\./, ".")
  meta_description = truncate(meta_description, META_DESCRIPTION_MAX)

  const colorOption = p.options?.find((o) => /culoare|color|colour/i.test(o.title))
  const colors = colorOption?.values?.map((v) => v.value).filter(Boolean) ?? []
  const images = p.images ?? []
  const image_alts: Record<string, string> = {}
  images.forEach((img, i) => {
    const color = colors.length === images.length ? colors[i] : colors.length === 1 ? colors[0] : undefined
    const key = img.id ?? img.url
    image_alts[key] = [p.title, color, i === 0 ? null : `imagine ${i + 1}`].filter(Boolean).join(" – ")
  })

  if (!plain) issues.push("missing_description")
  else if (plain.length < 50) issues.push("short_description")
  if (!images.length && !p.thumbnail) issues.push("missing_images")
  if (!p.variants?.some((v) => v.barcode || v.ean || v.upc)) issues.push("missing_gtin")
  if (!p.variants?.every((v) => v.sku)) issues.push("missing_sku")
  if (/[^a-z0-9-]/.test(p.handle)) issues.push("non_ascii_handle")

  return {
    meta_title,
    meta_description,
    og_image: images[0]?.url ?? p.thumbnail ?? null,
    canonical_path: `/products/${p.handle}`,
    image_alts,
    noindex: false,
    issues,
  }
}

export function generateListingSeo(input: { title: string; description?: string | null; handle: string; kind: "collection" | "category" }) {
  const plain = stripHtml(input.description)
  return {
    meta_title: truncate(input.title, META_TITLE_MAX),
    meta_description: truncate(
      plain || `Descoperă ${input.title.toLowerCase()} OutfitHub. Livrare rapidă prin Sameday, retur 30 de zile.`,
      META_DESCRIPTION_MAX
    ),
    canonical_path: `/${input.kind === "collection" ? "collections" : "categories"}/${input.handle}`,
    og_image: null,
    image_alts: {},
    noindex: false,
    issues: plain ? [] : ["missing_description"],
  }
}
