import { PackageCheck, RefreshCcw, Truck, Wallet } from "lucide-react"

const ICONS = [Truck, RefreshCcw, Wallet, PackageCheck]

export function UspStrip({ items }: { items: { title: string; body: string }[] }) {
  if (!items.length) return null
  return (
    <section aria-label="Avantaje" className="container-page">
      <ul className="grid grid-cols-1 divide-y divide-line rounded-xl border border-line bg-surface/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.slice(0, 4).map((u, i) => {
          const Icon = ICONS[i % ICONS.length]
          return (
            <li key={u.title} className="flex items-center gap-4 px-6 py-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper-2">
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-medium">{u.title}</span>
                <span className="block text-xs text-muted">{u.body}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
