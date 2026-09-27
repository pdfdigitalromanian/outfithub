import type { ChannelProduct } from "./product-loader"

export type ChannelIssue = { severity: "error" | "warning"; code: string; message: string }

/** Pre-flight validation shared by all channels (Google/Meta/TikTok rules overlap). */
export function validateChannelProduct(p: ChannelProduct, provider: string): ChannelIssue[] {
  const issues: ChannelIssue[] = []
  if (!p.images.length) issues.push({ severity: "error", code: "missing_image", message: "Produsul nu are imagini." })
  if (!p.variants.length) issues.push({ severity: "error", code: "missing_variants", message: "Produsul nu are variante." })
  if (p.variants.some((v) => v.price == null))
    issues.push({ severity: "error", code: "missing_price", message: "Una sau mai multe variante nu au preț în moneda magazinului." })
  if (p.variants.some((v) => !v.sku))
    issues.push({ severity: provider === "tiktok_shop" ? "error" : "warning", code: "missing_sku", message: "Una sau mai multe variante nu au SKU." })
  if (!p.variants.some((v) => v.gtin))
    issues.push({ severity: "warning", code: "missing_gtin", message: "Nu există GTIN/EAN; produsul va fi trimis cu identifier_exists=false." })
  if ((p.description ?? "").replace(/<[^>]+>/g, "").trim().length < 30)
    issues.push({ severity: "warning", code: "short_description", message: "Descrierea este foarte scurtă." })
  if (p.title.length > 150) issues.push({ severity: "error", code: "title_too_long", message: "Titlul depășește 150 de caractere." })
  if (/^http:\/\/localhost/.test(p.url))
    issues.push({ severity: "warning", code: "local_url", message: "STOREFRONT_URL indică localhost; canalele externe au nevoie de un domeniu public." })
  return issues
}

export const hasBlockingIssues = (issues: ChannelIssue[]) => issues.some((i) => i.severity === "error")
