"use client"

import { useEffect } from "react"
import { track, type TrackItem } from "@/lib/client/tracking"

/** Fires the browser purchase event once per order (event_id = order id for CAPI dedup). */
export function PurchaseTracker({ orderId, displayId, value, currency, items }: { orderId: string; displayId: string; value: number; currency: string; items: TrackItem[] }) {
  useEffect(() => {
    const key = `oh_purchase_${orderId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {}
    track("purchase", { transaction_id: displayId, value, currency, items, event_id: orderId })
  }, [orderId, displayId, value, currency, items])
  return null
}
