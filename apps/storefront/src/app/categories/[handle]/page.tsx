import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CatalogView, ListingHeader } from "@/components/listing/catalog-view"
import { JsonLd } from "@/components/json-ld"
import { getCategories, getProductCards } from "@/lib/data/products"
import { getSeo } from "@/lib/data/seo"
import { parseFilters } from "@/lib/catalog"
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo"

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ handle: c.handle }))
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { handle } = await params
  const [categories, seo, sp] = await Promise.all([getCategories(), getSeo("category", handle), searchParams])
  const category = categories.find((c) => c.handle === handle)
  if (!category) return {}
  return pageMetadata({
    title: seo?.meta_title || category.name,
    description: seo?.meta_description ?? category.description,
    path: seo?.canonical_path || `/categories/${handle}`,
    image: seo?.og_image,
    noindex: seo?.noindex || Object.keys(sp).some((k) => k !== "page"),
  })
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { handle } = await params
  const [categories, cards, sp] = await Promise.all([getCategories(), getProductCards(), searchParams])
  const category = categories.find((c) => c.handle === handle)
  if (!category) notFound()
  const childIds = new Set([category.id, ...categories.filter((c) => c.parent_category_id === category.id).map((c) => c.id)])
  const base = cards.filter((p) => p.categories.some((c) => childIds.has(c.id)))
  const parent = categories.find((c) => c.id === category.parent_category_id)
  const crumbs = [
    { name: "Acasă", href: "/" },
    { name: "Magazin", href: "/shop" },
    ...(parent ? [{ name: parent.name, href: `/categories/${parent.handle}` }] : []),
    { name: category.name, href: `/categories/${handle}` },
  ]
  return (
    <>
      <ListingHeader eyebrow="Categorie" title={category.name} description={category.description} crumbs={crumbs} />
      <div className="container-page">
        <CatalogView base={base} filters={parseFilters(sp)} basePath={`/categories/${handle}`} hide={["category"]} />
      </div>
      <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, path: c.href })))} />
    </>
  )
}
