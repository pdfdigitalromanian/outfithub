"use client"

import Link from "next/link"
import { ArrowUpRight, Heart, Package, User } from "lucide-react"
import { Sheet } from "../ui/sheet"
import type { NavData } from "./header"

export function MobileMenu({
  open,
  onOpenChange,
  links,
  nav,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  links: { href: string; label: string }[]
  nav: NavData
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="left" title="Meniu">
      <nav aria-label="Meniu mobil" className="flex h-full flex-col px-5 py-6">
        <ul className="flex flex-col">
          {links.map((l, i) => (
            <li key={l.href} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
              <Link href={l.href} className="flex items-center justify-between border-b border-line py-4 display text-3xl">
                {l.label}
                <ArrowUpRight className="h-5 w-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
        {nav.collections.length > 2 && (
          <div className="mt-6">
            <p className="eyebrow mb-3">Colecții</p>
            <div className="flex flex-wrap gap-2">
              {nav.collections.map((c) => (
                <Link key={c.handle} href={`/collections/${c.handle}`} className="rounded-full border border-line px-4 py-2 text-sm">
                  {c.title}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto grid grid-cols-3 gap-2 pt-8">
          {[
            { href: "/account", label: "Cont", icon: User },
            { href: "/wishlist", label: "Favorite", icon: Heart },
            { href: "/account/orders", label: "Comenzi", icon: Package },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-md bg-paper-2 py-4 text-xs">
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </Sheet>
  )
}
