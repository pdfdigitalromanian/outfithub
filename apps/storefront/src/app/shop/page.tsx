import type { Metadata } from "next"
import { CatalogView, ListingHeader } from "@/components/listing/catalog-view"
import { JsonLd } from "@/components/json-ld"
import { getProductCards } from "@/lib/data/products"
import { parseFilters } from "@/lib/catalog"
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const filtered = Object.keys(sp).some((k) => k !== "page")
  return pageMetadata({
    title: "Toate produsele",
    description: "Toată colecția OutfitHub: tricouri, hanorace și pantaloni. Livrare rapidă prin Sameday, retur 30 de zile.",
    path: "/shop",
    // Filtered/sorted variants are not indexed; canonical points to /shop.
    noindex: filtered,
  })
}

export default async function ShopPage({ searchParams }: Props) {
  const [sp, cards] = await Promise.all([searchParams, getProductCards()])
  const filters = parseFilters(sp)
  return (
    <>
      <ListingHeader
        eyebrow="Magazin"
        title="Toate produsele"
        crumbs={[
          { name: "Acasă", href: "/" },
          { name: "Magazin", href: "/shop" },
        ]}
      />
      <div className="container-page">
        <CatalogView base={cards} filters={filters} basePath="/shop" />
      </div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Acasă", path: "/" }, { name: "Magazin", path: "/shop" }])} />
    </>
  )
}
