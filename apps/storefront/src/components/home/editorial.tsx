import Image from "next/image"
import { ButtonLink } from "../ui/button"
import type { SiteContent } from "@/lib/data/content"
import type { ProductCardData } from "@/lib/catalog"

export function Editorial({ editorial, products }: { editorial: SiteContent["homepage"]["editorial"]; products: ProductCardData[] }) {
  if (!editorial.title) return null
  const images = editorial.image_url ? [editorial.image_url] : products.map((p) => p.hoverImage ?? p.thumbnail).filter(Boolean).slice(0, 2) as string[]
  return (
    <section className="container-page" aria-labelledby="editorial-title">
      <div className="grid overflow-hidden rounded-2xl bg-ink text-paper lg:grid-cols-2">
        <div className="flex flex-col justify-center gap-6 p-8 sm:p-12 xl:p-16">
          {editorial.eyebrow && <p className="eyebrow !text-paper/55">{editorial.eyebrow}</p>}
          <h2 id="editorial-title" className="display text-5xl sm:text-6xl xl:text-7xl">
            {editorial.title}
          </h2>
          {editorial.body && <p className="max-w-md text-[1.02rem] leading-relaxed text-paper/70">{editorial.body}</p>}
          {editorial.cta_label && (
            <div>
              <ButtonLink href={editorial.cta_href || "/shop"} variant="secondary" className="!border-transparent">
                {editorial.cta_label}
              </ButtonLink>
            </div>
          )}
        </div>
        <div className="relative grid min-h-[360px] grid-cols-2 gap-3 p-3 sm:min-h-[480px]">
          {images.map((src, i) => (
            <div key={src} className={`relative overflow-hidden rounded-xl bg-paper-2 ${images.length === 1 ? "col-span-2" : i === 1 ? "h-[calc(100%-3rem)] self-end" : "h-[calc(100%-3rem)] self-start"}`}>
              <Image src={src} alt={i === 0 ? editorial.image_alt || "" : ""} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover mix-blend-multiply" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
