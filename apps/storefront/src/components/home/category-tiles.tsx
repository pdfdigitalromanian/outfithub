import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/util/cn"

export type CategoryTile = { handle: string; name: string; count: number; image: string | null }

const TONES = ["bg-sand", "bg-moss-soft", "bg-clay-soft", "bg-paper-2"]

export function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  if (!tiles.length) return null
  const odd = tiles.length % 2 === 1
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:gap-4", tiles.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
      {tiles.slice(0, 8).map((t, i) => (
        <li key={t.handle} className={cn(odd && i === 0 && "col-span-2 lg:col-span-1")}>
          <Link
            href={`/categories/${t.handle}`}
            className={cn(
              "group relative isolate flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-xl p-5 sm:p-7",
              odd && i === 0 && "aspect-[16/10] lg:aspect-[4/5]",
              TONES[i % TONES.length]
            )}
          >
            {t.image && (
              <span className="absolute inset-x-0 bottom-0 top-[26%] -z-10">
                <Image
                  src={t.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="object-cover object-top mix-blend-multiply transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.05]"
                />
              </span>
            )}
            <span className="flex items-start justify-between gap-2">
              <span>
                <span className="display block text-3xl sm:text-4xl">{t.name}</span>
                <span className="mt-1 block text-xs text-muted">
                  {t.count} {t.count === 1 ? "produs" : "produse"}
                </span>
              </span>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface/80 backdrop-blur transition-colors group-hover:bg-ink group-hover:text-paper">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
