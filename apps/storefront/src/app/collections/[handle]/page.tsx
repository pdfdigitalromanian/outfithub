import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CatalogView, ListingHeader } from "@/components/listing/catalog-view"
import { JsonLd } from "@/components/json-ld"
import { getCollections, getProductCards } from "@/lib/data/products"
import { getSeo } from "@/lib/data/seo"
import { parseFilters } from "@/lib/catalog"
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo"

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ handle: c.handle }))
}

async function load(handle: string) {
  const collection = (await getCollections()).find((c) => c.handle === handle)
  return collection ?? null
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { handle } = await params
  const [collection, seo, sp] = await Promise.all([load(handle), getSeo("collection", handle), searchParams])
  if (!collection) return {}
  const description = seo?.meta_description ?? ((collection.metadata as any)?.description as string | undefined)
  return pageMetadata({
    title: seo?.meta_title || collection.title,
    description,
    path: seo?.canonical_path || `/collections/${handle}`,
    image: seo?.og_image,
    noindex: seo?.noindex || Object.keys(sp).some((k) => k !== "page"),
  })
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { handle } = await params
  const [collection, cards, sp] = await Promise.all([load(handle), getProductCards(), searchParams])
  if (!collection) notFound()
  const base = cards.filter((c) => c.collection?.handle === handle)
  const crumbs = [
    { name: "Acasă", href: "/" },
    { name: "Magazin", href: "/shop" },
    { name: collection.title, href: `/collections/${handle}` },
  ]
  return (
    <>
      <ListingHeader eyebrow="Colecție" title={collection.title} description={(collection.metadata as any)?.description} crumbs={crumbs} />
      <div className="container-page">
        <CatalogView base={base} filters={parseFilters(sp)} basePath={`/collections/${handle}`} hide={["collection"]} />
      </div>
      <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, path: c.href })))} />
    </>
  )
}
