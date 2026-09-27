import Link from "next/link"
import { cn } from "@/lib/util/cn"

export function Logo({ className, name = "OutfitHub" }: { className?: string; name?: string }) {
  return (
    <Link href="/" aria-label={`${name} – pagina principală`} className={cn("group inline-flex items-center gap-2", className)}>
      <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-ink text-paper transition-transform duration-500 group-hover:rotate-[20deg]">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
          <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </span>
      <span className="display text-[1.45rem] leading-none tracking-[-0.03em]">{name}</span>
    </Link>
  )
}
