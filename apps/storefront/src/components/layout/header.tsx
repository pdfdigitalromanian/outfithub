"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react"
import { Logo } from "../ui/logo"
import { useCart, useWishlist } from "../providers"
import dynamic from "next/dynamic"

// Overlays are code-split and only mounted after first use.
const MobileMenu = dynamic(() => import("./mobile-menu").then((m) => m.MobileMenu), { ssr: false })
const SearchDialog = dynamic(() => import("./search-dialog").then((m) => m.SearchDialog), { ssr: false })
const CartDrawer = dynamic(() => import("../cart/cart-drawer").then((m) => m.CartDrawer), { ssr: false })
import { cn } from "@/lib/util/cn"

export type NavData = {
  categories: { handle: string; name: string }[]
  collections: { handle: string; title: string }[]
  siteName: string
  freeShippingThreshold: number
}

export function Header({ nav }: { nav: NavData }) {
  const pathname = usePathname()
  const { count, setOpen, open: cartOpen } = useCart()
  const { ids } = useWishlist()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const minimal = pathname?.startsWith("/checkout")
  const [used, setUsed] = useState({ menu: false, search: false, cart: false })
  if ((menuOpen && !used.menu) || (searchOpen && !used.search) || (cartOpen && !used.cart)) {
    setUsed({ menu: used.menu || menuOpen, search: used.search || searchOpen, cart: used.cart || cartOpen })
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close overlays on navigation (derived-state pattern, no effect needed).
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMenuOpen(false)
    setSearchOpen(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/input|textarea|select/i.test((e.target as HTMLElement).tagName))) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (minimal) {
    return (
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo name={nav.siteName} />
          <Link href="/cart" className="text-sm text-muted underline-offset-4 hover:underline">
            Înapoi la coș
          </Link>
        </div>
      </header>
    )
  }

  const links = [
    { href: "/shop", label: "Magazin" },
    ...nav.categories.slice(0, 4).map((c) => ({ href: `/categories/${c.handle}`, label: c.name })),
    ...nav.collections.slice(0, 2).map((c) => ({ href: `/collections/${c.handle}`, label: c.title })),
  ]

  return (
    <>
      <header className="sticky top-0 z-30 px-2 pt-2 sm:px-3">
        <div
          className={cn(
            "mx-auto flex h-14 max-w-[1520px] items-center justify-between gap-2 rounded-full border px-2 transition-all duration-300 sm:h-16 sm:px-4",
            scrolled ? "glass border-white/70" : "border-transparent bg-transparent"
          )}
        >
          <div className="flex flex-1 items-center gap-1">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/[0.06] lg:hidden"
              aria-label="Deschide meniul"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Principal" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {links.map((l) => {
                  const active = pathname === l.href || (l.href !== "/shop" && pathname?.startsWith(l.href))
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "rounded-full px-3.5 py-2 text-[0.84rem] transition-colors",
                          active ? "bg-ink text-paper" : "text-ink-2 hover:bg-ink/[0.06]"
                        )}
                      >
                        {l.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>

          <Logo name={nav.siteName} className="shrink-0" />

          <div className="flex flex-1 items-center justify-end gap-0.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-10 items-center gap-2 rounded-full border border-line bg-surface/70 pl-3.5 pr-2 text-[0.8rem] text-muted transition-colors hover:border-stone md:flex"
              aria-label="Caută produse"
            >
              <Search className="h-4 w-4" />
              <span className="w-24 text-left">Caută</span>
              <kbd className="rounded-md border border-line px-1.5 text-[0.65rem]">/</kbd>
            </button>
            <button type="button" onClick={() => setSearchOpen(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/[0.06] md:hidden" aria-label="Caută produse">
              <Search className="h-5 w-5" />
            </button>
            <Link href="/wishlist" className="relative hidden h-10 w-10 place-items-center rounded-full hover:bg-ink/[0.06] sm:grid" aria-label={`Favorite (${ids.length})`}>
              <Heart className="h-5 w-5" />
              {ids.length > 0 && <Dot n={ids.length} />}
            </Link>
            <Link href="/account" className="hidden h-10 w-10 place-items-center rounded-full hover:bg-ink/[0.06] sm:grid" aria-label="Contul meu">
              <User className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-ink/[0.06]"
              aria-label={`Coș de cumpărături, ${count} produse`}
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && <Dot n={count} />}
            </button>
          </div>
        </div>
      </header>
      {used.menu && <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} links={links} nav={nav} />}
      {used.search && <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />}
      {used.cart && <CartDrawer freeShippingThreshold={nav.freeShippingThreshold} />}
    </>
  )
}

function Dot({ n }: { n: number }) {
  return (
    <span aria-hidden className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-clay px-1 text-[0.62rem] font-semibold text-white tabular-nums">
      {n > 99 ? "99+" : n}
    </span>
  )
}
