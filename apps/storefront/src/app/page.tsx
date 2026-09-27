import type { Metadata } from "next"
import { Hero } from "@/components/home/hero"
import { UspStrip } from "@/components/home/usp-strip"
import { SectionHeading } from "@/components/home/section-heading"
import { CategoryTiles } from "@/components/home/category-tiles"
import { Editorial } from "@/components/home/editorial"
import { ProductGrid } from "@/components/product/product-card"
import { RecentlyViewed } from "@/components/product/recently-viewed"
import { getStoreConfig } from "@/lib/data/content"
import { getCategories, getCollections, getProductCards } from "@/lib/data/products"
import { pageMetadata } from "@/lib/seo"

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getStoreConfig()
  return pageMetadata({
    title: content.seo.default_title,
    description: content.seo.default_description,
    path: "/",
    image: content.seo.default_og_image || null,
    absoluteTitle: true,
  })
}

export default async function HomePage() {
  const [{ content }, cards, categories, collections] = await Promise.all([getStoreConfig(), getProductCards(), getCategories(), getCollections()])
  const home = content.homepage
  const inStock = cards.filter((c) => c.inStock)
  const newest = [...inStock].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const heroProducts = [...inStock].sort((a, b) => (b.price ?? 0) - (a.price ?? 0)).slice(0, 3)

  const tiles = categories
    .filter((c) => !c.parent_category_id)
    .map((c) => {
      const members = cards.filter((p) => p.categories.some((k) => k.id === c.id))
      return { handle: c.handle, name: c.name, count: members.length, image: members[0]?.thumbnail ?? null }
    })
    .filter((t) => t.count > 0)

  const featured = (home.featured_collections?.length ? home.featured_collections : collections.map((c) => c.handle))
    .map((handle) => {
      const col = collections.find((c) => c.handle === handle)
      return col ? { col, items: cards.filter((p) => p.collection?.handle === handle).slice(0, 4) } : null
    })
    .filter((x): x is NonNullable<typeof x> => !!x && x.items.length > 0)
    .slice(0, 2)

  return (
    <>
      <Hero hero={home.hero} products={heroProducts} />
      <UspStrip items={home.usps} />

      {newest.length > 0 && (
        <section className="container-page mt-20 sm:mt-28" aria-labelledby="new-title">
          <SectionHeading eyebrow="Proaspăt sosite" title={home.featured_title || "Noutăți"} href="/shop?sort=newest" id="new-title" />
          <ProductGrid products={newest.slice(0, 8)} />
        </section>
      )}

      {tiles.length > 0 && (
        <section className="container-page mt-20 sm:mt-28" aria-labelledby="cat-title">
          <SectionHeading eyebrow="Categorii" title="Alege după stil" href="/shop" id="cat-title" linkLabel="Tot magazinul" />
          <CategoryTiles tiles={tiles} />
        </section>
      )}

      <div className="mt-20 sm:mt-28">
        <Editorial editorial={home.editorial} products={cards.slice(-2)} />
      </div>

      {featured.map(({ col, items }) => (
        <section key={col.id} className="container-page mt-20 sm:mt-28" aria-labelledby={`col-${col.handle}`}>
          <SectionHeading eyebrow="Colecție" title={col.title} href={`/collections/${col.handle}`} id={`col-${col.handle}`} />
          <ProductGrid products={items} />
        </section>
      ))}

      <RecentlyViewed />
    </>
  )
}
