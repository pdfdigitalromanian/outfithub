import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Gallery } from "@/components/product/gallery"
import { ProductInfo } from "@/components/product/product-info"
import { ProductAccordion } from "@/components/product/product-accordion"
import { ProductGrid } from "@/components/product/product-card"
import { RecentlyViewed } from "@/components/product/recently-viewed"
import { ViewTracker } from "@/components/product/view-tracker"
import { JsonLd } from "@/components/json-ld"
import { getAllProducts, getProductByHandle, getRelatedProducts } from "@/lib/data/products"
import { getSeo } from "@/lib/data/seo"
import { getStoreConfig } from "@/lib/data/content"
import { variantInfo } from "@/lib/catalog"
import { absolute, breadcrumbJsonLd, pageMetadata, productJsonLd } from "@/lib/seo"

type Props = { params: Promise<{ handle: string }> }

export const revalidate = 60

export async function generateStaticParams() {
  return (await getAllProducts()).slice(0, 200).map((p) => ({ handle: p.handle! }))
}

const plain = (html: string | null | undefined) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const [product, seo] = await Promise.all([getProductByHandle(handle), getSeo("product", handle)])
  if (!product) return { title: "Produs negăsit", robots: { index: false } }
  const fallbackDescription = plain(product.description).slice(0, 155)
  return pageMetadata({
    title: seo?.meta_title || product.title!,
    description: seo?.meta_description || fallbackDescription,
    path: seo?.canonical_path || `/products/${handle}`,
    image: seo?.og_image || product.thumbnail,
    noindex: seo?.noindex,
  })
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params
  const [product, seo, { content }] = await Promise.all([getProductByHandle(handle), getSeo("product", handle), getStoreConfig()])
  if (!product) notFound()
  const related = await getRelatedProducts(product)

  const variants = (product.variants ?? []).map(variantInfo)
  const options = (product.options ?? []).map((o) => ({
    title: o.title ?? "",
    values: [...new Set((o.values ?? []).map((v) => v.value))],
  }))
  const alts = seo?.image_alts ?? {}
  const images = (product.images ?? []).map((img, i) => ({
    id: img.id,
    url: img.url,
    alt: alts[img.id] ?? alts[img.url] ?? (i === 0 ? product.title! : `${product.title} – imagine ${i + 1}`),
  }))
  if (!images.length && product.thumbnail) images.push({ id: "thumb", url: product.thumbnail, alt: product.title! })

  const category = (product as any).categories?.[0] as { name: string; handle: string } | undefined
  const crumbs = [
    { name: "Acasă", path: "/" },
    { name: "Magazin", path: "/shop" },
    ...(category ? [{ name: category.name, path: `/categories/${category.handle}` }] : []),
    { name: product.title!, path: `/products/${handle}` },
  ]
  const url = absolute(seo?.canonical_path || `/products/${handle}`)
  const description = plain(product.description) || product.subtitle || product.title!
  const brand = content.seo.site_name || "OutfitHub"
  const firstPriced = variants.find((v) => v.price != null)

  return (
    <>
      <div className="container-page pt-4 sm:pt-8">
        <nav aria-label="Breadcrumb" className="mb-5 hidden md:block">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {crumbs.map((c, i) => (
              <li key={c.path} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {i === crumbs.length - 1 ? (
                  <span aria-current="page" className="text-ink">
                    {c.name}
                  </span>
                ) : (
                  <Link href={c.path} className="hover:text-ink">
                    {c.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid gap-8 md:grid-cols-12 lg:gap-12">
          <div className="md:col-span-7">
            <Gallery images={images} title={product.title!} />
          </div>
          <div className="md:col-span-5">
            <div className="md:sticky md:top-24">
              <Suspense>
                <ProductInfo
                  product={{ id: product.id, title: product.title!, subtitle: product.subtitle ?? null, collection: product.collection?.title ?? null }}
                  options={options}
                  variants={variants}
                  deliveryEstimate={content.shipping.delivery_estimate}
                  returnsDays={content.shipping.returns_days}
                />
              </Suspense>
              <div className="mt-8">
                <ProductAccordion
                  items={[
                    {
                      id: "description",
                      title: "Descriere",
                      content: <p className="whitespace-pre-line">{description}</p>,
                    },
                    {
                      id: "details",
                      title: "Material și îngrijire",
                      content: (
                        <ul className="flex flex-col gap-1.5">
                          {product.material && <li>Compoziție: {product.material}</li>}
                          <li>Spălare la 30°C, pe dos, cu culori asemănătoare.</li>
                          <li>Nu folosi înălbitor. Călcare la temperatură medie.</li>
                          {variants[0]?.sku && <li className="text-muted">Cod produs: {variants[0].sku.split("-").slice(0, 2).join("-")}</li>}
                        </ul>
                      ),
                    },
                    {
                      id: "shipping",
                      title: "Livrare și retur",
                      content: (
                        <p>
                          Livrare prin Sameday la adresă sau în Easybox, în {content.shipping.delivery_estimate}. Transport gratuit peste{" "}
                          {content.shipping.free_shipping_threshold} lei. Retur în {content.shipping.returns_days} de zile.{" "}
                          <Link href="/pages/livrare" className="underline underline-offset-2">
                            Detalii livrare
                          </Link>{" "}
                          ·{" "}
                          <Link href="/pages/retur" className="underline underline-offset-2">
                            Retururi
                          </Link>
                        </p>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="related-title">
          <h2 id="related-title" className="display mb-8 text-4xl sm:text-5xl">
            Se potrivește cu
          </h2>
          <ProductGrid products={related} />
        </section>
      )}

      <RecentlyViewed excludeId={product.id} />

      <ViewTracker id={firstPriced?.sku ?? product.id} name={product.title!} price={firstPriced?.price ?? 0} category={category?.name} />
      <JsonLd data={productJsonLd(product, { brand, url, description })} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  )
}
