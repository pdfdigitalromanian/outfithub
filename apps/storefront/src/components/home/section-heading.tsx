import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function SectionHeading({ eyebrow, title, href, linkLabel = "Vezi tot", id }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; id?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6">
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 id={id} className="display text-[2.4rem] sm:text-5xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href} className="group hidden shrink-0 items-center gap-2 text-sm font-medium sm:flex">
          {linkLabel}
          <span className="grid h-9 w-9 place-items-center rounded-full border border-line transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}
    </div>
  )
}
