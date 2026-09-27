"use client"

import { usePathname } from "next/navigation"

/** Keeps checkout distraction-free (no marketing footer / announcement). */
export function HideOnCheckout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith("/checkout")) return null
  return <>{children}</>
}
