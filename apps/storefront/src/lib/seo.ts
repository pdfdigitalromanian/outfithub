import type { Metadata } from "next"
import type { HttpTypes } from "@medusajs/types"
import { SITE_URL } from "./env"
import type { SiteContent } from "./data/content"
import { variantInfo } from "./catalog"

export const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`)

export function pageMetadata({
  title,
  description,
  path,
  image,
  noindex,
  type = "website",
  absoluteTitle,
}: {
  title: string
  description?: string | null
  path: string
  image?: string | null
  noindex?: boolean
  type?: "website" | "article"
  absoluteTitle?: boolean
}): Metadata {
  const url = absolute(path)
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: description ?? undefined,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type,
      url,
      title,
      description: description ?? undefined,
      locale: "ro_RO",
      ...(image ? { images: [{ url: absolute(image), width: 1200, height: 1500, alt: title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description: description ?? undefined,
      ...(image ? { images: [absolute(image)] } : {}),
    },
  }
}

/** schema.org Product with one Offer per variant (AggregateOffer semantics via ProductGroup). */
export function productJsonLd(p: HttpTypes.StoreProduct, opts: { brand: string; url: string; description: string }) {
  const variants = (p.variants ?? []).map(variantInfo)
  const images = (p.images ?? []).map((i) => i.url)
  const priceValidUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10)
  const offerFor = (v: ReturnType<typeof variantInfo>) => ({
    "@type": "Offer",
    url: variants.length > 1 ? `${opts.url}?variant=${v.id}` : opts.url,
    priceCurrency: v.currency.toUpperCase(),
    price: v.price != null ? v.price.toFixed(2) : undefined,
    priceValidUntil,
    availability: v.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: opts.brand },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "RO",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 30,
      returnMethod: "https://schema.org/ReturnByMail",
    },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "RO" },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
        transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
      },
    },
  })

  if (variants.length > 1) {
    const variesBy: string[] = []
    if (p.options?.some((o) => /culoare|color/i.test(o.title ?? ""))) variesBy.push("https://schema.org/color")
    if (p.options?.some((o) => /mărime|marime|size/i.test(o.title ?? ""))) variesBy.push("https://schema.org/size")
    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      name: p.title,
      description: opts.description,
      url: opts.url,
      productGroupID: p.id,
      brand: { "@type": "Brand", name: opts.brand },
      ...(p.material ? { material: p.material } : {}),
      variesBy,
      hasVariant: (p.variants ?? []).map((raw, i) => {
        const v = variants[i]
        const color = Object.entries(v.options).find(([k]) => /culoare|color/i.test(k))?.[1]
        const size = Object.entries(v.options).find(([k]) => /mărime|marime|size/i.test(k))?.[1]
        const gtin = raw.barcode || raw.ean || raw.upc
        return {
          "@type": "Product",
          name: [p.title, color, size].filter(Boolean).join(" – "),
          sku: v.sku ?? v.id,
          ...(gtin ? { gtin } : {}),
          image: images[0],
          ...(color ? { color } : {}),
          ...(size ? { size } : {}),
          offers: offerFor(v),
        }
      }),
      image: images,
    }
  }
  const v = variants[0]
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: opts.description,
    url: opts.url,
    image: images,
    sku: v?.sku ?? p.id,
    brand: { "@type": "Brand", name: opts.brand },
    ...(v ? { offers: offerFor(v) } : {}),
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absolute(it.path) })),
  }
}

export function organizationJsonLd(content: SiteContent) {
  const sameAs = Object.values(content.social).filter(Boolean)
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: content.seo.site_name || content.company.trade_name,
    url: SITE_URL,
    logo: absolute("/icons/512"),
    ...(content.company.email ? { email: content.company.email } : {}),
    ...(content.company.phone ? { telephone: content.company.phone } : {}),
    ...(content.company.legal_name ? { legalName: content.company.legal_name } : {}),
    ...(content.company.cui ? { vatID: content.company.cui } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

export function websiteJsonLd(name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  }
}

/** Safe JSON-LD serialization (escapes `<` to prevent script injection). */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c")
