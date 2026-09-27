import Link from "next/link"

export function AnnouncementBar({ enabled, text, href }: { enabled: boolean; text: string; href: string }) {
  if (!enabled || !text) return null
  const inner = <span className="truncate">{text}</span>
  return (
    <div className="bg-ink text-paper">
      <div className="container-page flex h-9 items-center justify-center text-[0.75rem] tracking-wide">
        {href ? (
          <Link href={href} className="flex min-w-0 items-center gap-2 hover:underline underline-offset-4">
            {inner}
            <span aria-hidden>→</span>
          </Link>
        ) : (
          inner
        )}
      </div>
    </div>
  )
}
