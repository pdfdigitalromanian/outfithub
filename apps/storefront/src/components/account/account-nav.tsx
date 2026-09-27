"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, LayoutGrid, LogOut, MapPin, Package, UserRound } from "lucide-react"
import { logoutAction } from "@/lib/actions/account"
import { cn } from "@/lib/util/cn"

const LINKS = [
  { href: "/account", label: "Prezentare", icon: LayoutGrid },
  { href: "/account/orders", label: "Comenzi", icon: Package },
  { href: "/account/addresses", label: "Adrese", icon: MapPin },
  { href: "/account/profile", label: "Profil", icon: UserRound },
  { href: "/wishlist", label: "Favorite", icon: Heart },
]

export function AccountNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Cont" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/account" ? pathname === href : pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors lg:rounded-md",
              active ? "bg-ink text-paper" : "bg-surface hover:bg-paper-2 lg:bg-transparent"
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        )
      })}
      <form action={logoutAction} className="shrink-0 lg:mt-4">
        <button type="submit" className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-muted hover:text-ink lg:rounded-md">
          <LogOut className="h-4 w-4" /> Deconectare
        </button>
      </form>
    </nav>
  )
}
