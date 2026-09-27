import Image from "next/image"
import Link from "next/link"
import type { ProductCardData } from "@/lib/catalog"
import { swatchFor } from "@/lib/catalog"
import { Price } from "../ui/price"
import { WishlistButton } from "./wishlist-button"
import { cn } from "@/lib/util/cn"

export function ProductCard({ product, priority, sizes }: { product: ProductCardData; priority?: boolean; sizes?: string }) {
  const onSale = product.originalPrice != null && product.price != null && product.price < product.originalPrice
  const isNew = product.isNew
  const imgSizes = sizes ?? "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
  return (
    <article className="group relative flex flex-col">
      <Link href={`/products/${product.handle}`} tabIndex={-1} aria-hidden className="product-frame relative block aspect-[4/5] overflow-hidden rounded-lg">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            priority={priority}
            sizes={imgSizes}
            className={cn("object-cover transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.035]", product.hoverImage && "group-hover:opacity-0")}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-xs text-muted">Fără imagine</span>
        )}
        {product.hoverImage && (
          <Image
            src={product.hoverImage}
            alt=""
            aria-hidden
            fill
            sizes={imgSizes}
            className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          />
        )}
        <span className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {!product.inStock && <Badge tone="muted">Stoc epuizat</Badge>}
          {onSale && product.inStock && <Badge tone="clay">Reducere</Badge>}
          {isNew && product.inStock && !onSale && <Badge tone="light">Nou</Badge>}
        </span>
        {product.availableSizes.length > 0 && (
          <span className="pointer-events-none absolute inset-x-3 bottom-3 hidden translate-y-2 items-center justify-center gap-1 rounded-full glass px-3 py-2 text-[0.7rem] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
            <span className="text-muted">Mărimi:</span> {product.availableSizes.join(" · ")}
          </span>
        )}
      </Link>
      <WishlistButton productId={product.id} name={product.title} price={product.price} className="absolute right-3 top-3 z-10" />
      <div className="mt-3 flex flex-col gap-1 px-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[0.88rem] font-medium leading-snug sm:line-clamp-1 sm:text-[0.9rem]">
            <Link href={`/products/${product.handle}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {product.title}
            </Link>
          </h3>
          {product.colors.length > 1 ? (
            <span role="img" className="mt-1.5 flex items-center gap-1" aria-label={`${product.colors.length} culori: ${product.colors.join(", ")}`}>
              {product.colors.slice(0, 5).map((c) => (
                <span key={c} className="h-3 w-3 rounded-full border border-ink/15" style={{ background: swatchFor(c) }} />
              ))}
            </span>
          ) : (
            <p className="mt-0.5 truncate text-xs text-muted">{product.colors[0] ?? product.subtitle ?? product.categories[0]?.name}</p>
          )}
        </div>
        <Price amount={product.price} original={product.originalPrice} currency={product.currency} from={product.priceVaries} className="shrink-0 sm:justify-end sm:text-right" size="sm" />
      </div>
    </article>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "clay" | "muted" | "light" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider",
        tone === "clay" && "bg-clay text-white",
        tone === "muted" && "bg-ink/75 text-paper",
        tone === "light" && "bg-surface/90 text-ink"
      )}
    >
      {children}
    </span>
  )
}

export function ProductGrid({ products, priorityCount = 0, className }: { products: ProductCardData[]; priorityCount?: number; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-6 xl:gap-y-12", className)}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-6" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <div className="skeleton aspect-[4/5] rounded-lg" />
          <div className="skeleton mt-3 h-4 w-2/3 rounded-full" />
          <div className="skeleton mt-2 h-3 w-1/3 rounded-full" />
        </li>
      ))}
    </ul>
  )
}
