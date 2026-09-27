"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { Expand } from "lucide-react"
import { Modal } from "../ui/sheet"
import { cn } from "@/lib/util/cn"

export type GalleryImage = { id: string; url: string; alt: string }

/**
 * Mobile: swipeable scroll-snap carousel with position indicator.
 * Desktop: editorial two-column grid (first image full-width).
 * Any image opens a zoomable lightbox.
 */
export function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null)
  const track = useRef<HTMLDivElement>(null)

  if (!images.length) {
    return <div className="product-frame aspect-[4/5] rounded-xl" aria-label="Fără imagini" />
  }

  const onScroll = () => {
    const el = track.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <>
      {/* Mobile carousel */}
      <div className="relative -mx-4 md:hidden">
        <div
          ref={track}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          aria-roledescription="carusel"
          aria-label={`Imagini ${title}`}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setZoom(i)}
              className="product-frame relative aspect-[4/5] w-full shrink-0 snap-center"
              aria-label={`Mărește imaginea ${i + 1} din ${images.length}`}
            >
              <Image src={img.url} alt={img.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-full glass px-3 py-2" aria-hidden>
              {images.map((_, i) => (
                <span key={i} className={cn("h-1.5 rounded-full bg-ink transition-all duration-300", i === index ? "w-5" : "w-1.5 opacity-30")} />
              ))}
            </div>
            <span className="sr-only" aria-live="polite">
              Imaginea {index + 1} din {images.length}
            </span>
          </div>
        )}
      </div>

      {/* Desktop grid */}
      <div className="hidden grid-cols-2 gap-3 md:grid">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setZoom(i)}
            className={cn(
              "product-frame group relative overflow-hidden rounded-xl cursor-zoom-in",
              i === 0 || (images.length % 2 === 0 && i === images.length - 1 && images.length > 2) ? "col-span-2 aspect-[5/5.4]" : "aspect-[4/5]",
              images.length === 1 && "col-span-2"
            )}
            aria-label={`Mărește imaginea ${i + 1} din ${images.length}`}
          >
            <Image
              src={img.url}
              alt={img.alt}
              fill
              priority={i === 0}
              sizes={i === 0 ? "(min-width: 1280px) 50vw, 58vw" : "(min-width: 1280px) 25vw, 29vw"}
              className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.02]"
            />
            <span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full glass opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
              <Expand className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>

      <Modal open={zoom !== null} onOpenChange={(o) => !o && setZoom(null)} title={title} className="sm:w-[min(1000px,calc(100vw-2rem))]">
        {zoom !== null && (
          <div className="flex flex-col gap-3">
            <div className="product-frame relative aspect-[4/5] max-h-[75dvh] w-full overflow-hidden rounded-lg">
              <Image src={images[zoom].url} alt={images[zoom].alt} fill sizes="(min-width: 1024px) 900px, 100vw" quality={85} className="object-contain" />
            </div>
            {images.length > 1 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setZoom(i)}
                    aria-label={`Imaginea ${i + 1}`}
                    aria-current={i === zoom}
                    className={cn("product-frame relative h-20 w-16 shrink-0 overflow-hidden rounded-md border-2", i === zoom ? "border-ink" : "border-transparent")}
                  >
                    <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
