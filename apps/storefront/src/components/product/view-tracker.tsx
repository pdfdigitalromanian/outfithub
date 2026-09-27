"use client"

import { useEffect } from "react"
import { track } from "@/lib/client/tracking"
import { pushRecentlyViewed } from "@/lib/client/storage"
import { readConsent } from "@/lib/client/consent"

export function ViewTracker({ id, name, price, category }: { id: string; name: string; price: number; category?: string }) {
  useEffect(() => {
    if (readConsent()?.preferences) pushRecentlyViewed(id)
    track("view_item", { items: [{ id, name, price, category }] })
  }, [id, name, price, category])
  return null
}
