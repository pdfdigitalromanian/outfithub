import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ButtonLink } from "../ui/button"
import { Price } from "../ui/price"
import type { ProductCardData } from "@/lib/catalog"
import type { SiteContent } from "@/lib/data/content"

/**
 * Editorial split hero. When an admin sets a hero image it is used full-bleed
 * on the right; otherwise a composed collage of featured products is shown.
 */
export function Hero({ hero, products }: { hero: SiteContent["homepage"]["hero"]; products: ProductCardData[] }) {
  const [main, second, third] = products
  const words = hero.title.split(" ")
  const accentIndex = Math.max(0, words.length - 2)

  return (
    <section className="container-page pt-6 pb-10 sm:pt-10 lg:pb-16" aria-labelledby="hero-title">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6 xl:col-span-5">
          {hero.eyebrow && (
            <p className="eyebrow flex items-center gap-2 animate-rise">
              <span className="h-1.5 w-1.5 rounded-full bg-clay" aria-hidden />
              {hero.eyebrow}
            </p>
          )}
          <h1 id="hero-title" className="display mt-5 text-[3.1rem] sm:text-[4.2rem] lg:text-[4.6rem] xl:text-[5.4rem] animate-rise [animation-delay:60ms]">
            {words.map((w, i) => (
              <span key={i} className={i >= accentIndex ? "italic text-ink-2" : undefined}>
                {w}{" "}
              </span>
            ))}
          </h1>
          {hero.subtitle && <p className="mt-6 max-w-md text-[1.02rem] leading-relaxed text-muted animate-rise [animation-delay:120ms]">{hero.subtitle}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-3 animate-rise [animation-delay:180ms]">
            {hero.cta_label && (
              <ButtonLink href={hero.cta_href || "/shop"} size="lg">
                {hero.cta_label}
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            )}
            {hero.secondary_label && (
              <ButtonLink href={hero.secondary_href || "/shop"} size="lg" variant="ghost">
                {hero.secondary_label}
              </ButtonLink>
            )}
          </div>
        </div>

        <div className="relative lg:col-span-6 xl:col-span-7">
          {hero.image_url ? (
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl sm:aspect-[5/4] lg:aspect-[4/5] xl:aspect-[5/4]">
              <Image src={hero.image_url} alt={hero.image_alt || ""} fill loading="eager" fetchPriority="high" sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
            </div>
          ) : main ? (
            <div className="grid grid-cols-5 grid-rows-6 gap-3 sm:gap-4 h-[440px] sm:h-[560px] xl:h-[640px]">
              <CollageTile product={main} className="col-span-3 row-span-6" priority sizes="(min-width: 1024px) 33vw, 60vw" tag />
              {second && <CollageTile product={second} className="col-span-2 row-span-3 bg-sand" sizes="(min-width: 1024px) 22vw, 40vw" />}
              {third ? (
                <CollageTile product={third} className="col-span-2 row-span-3 bg-moss-soft" sizes="(min-width: 1024px) 22vw, 40vw" />
              ) : (
                <div className="col-span-2 row-span-3 rounded-xl bg-ink" />
              )}
            </div>
          ) : (
            <div className="aspect-[5/4] rounded-xl bg-paper-2" />
          )}
        </div>
      </div>
    </section>
  )
}

function CollageTile({
  product,
  className,
  priority,
  sizes,
  tag,
}: {
  product: ProductCardData
  className?: string
  priority?: boolean
  sizes: string
  tag?: boolean
}) {
  return (
    <Link href={`/products/${product.handle}`} className={`product-frame group relative overflow-hidden rounded-xl ${className ?? ""}`}>
      {product.thumbnail && (
        <Image
          src={product.thumbnail}
          alt={product.title}
          fill
          loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"}
          sizes={sizes}
          className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
        />
      )}
      {tag ? (
        <span className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-full glass py-2 pl-4 pr-2 sm:bottom-4 sm:left-4 sm:right-auto sm:min-w-[260px]">
          <span className="min-w-0">
            <span className="block truncate text-[0.8rem] font-medium">{product.title}</span>
            <Price amount={product.price} original={product.originalPrice} currency={product.currency} size="sm" className="text-muted" />
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-paper transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="h-4 w-4" />
          </span>
        </span>
      ) : (
        <span className="absolute bottom-3 left-3 rounded-full bg-surface/85 px-3 py-1.5 text-[0.7rem] font-medium backdrop-blur">{product.title}</span>
      )}
    </Link>
  )
}
