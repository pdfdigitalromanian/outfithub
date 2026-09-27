import type { Metadata } from "next"
import { CatalogView, ListingHeader } from "@/components/listing/catalog-view"
import { SearchBox } from "@/components/listing/search-box"
import { getProductCards } from "@/lib/data/products"
import { parseFilters } from "@/lib/catalog"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export const metadata: Metadata = {
  title: "Căutare",
  robots: { index: false, follow: true },
}

export default async function SearchPage({ searchParams }: Props) {
  const [sp, cards] = await Promise.all([searchParams, getProductCards()])
  const filters = parseFilters(sp)
  const q = filters.q?.trim() ?? ""
  return (
    <>
      <ListingHeader
        eyebrow="Căutare"
        title={q ? `„${q}”` : "Caută în magazin"}
        crumbs={[
          { name: "Acasă", href: "/" },
          { name: "Căutare", href: "/search" },
        ]}
      />
      <div className="container-page">
        <SearchBox initial={q} />
        {q ? (
          <CatalogView base={cards} filters={filters} basePath="/search" emptyTitle={`Nimic pentru „${q}”`} />
        ) : (
          <p className="py-10 text-sm text-muted">Scrie un termen pentru a căuta printre {cards.length} produse.</p>
        )}
      </div>
    </>
  )
}
