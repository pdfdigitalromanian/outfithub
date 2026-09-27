import { StatusBadge } from "@medusajs/ui"
import type { ConnectionStatus } from "../lib/types"

const CONNECTION: Record<ConnectionStatus, { label: string; color: "green" | "red" | "orange" | "grey" }> = {
  connected: { label: "Connected", color: "green" },
  error: { label: "Error", color: "red" },
  authorization_required: { label: "Authorization required", color: "orange" },
  not_configured: { label: "Not configured", color: "grey" },
}

export const ConnectionBadge = ({ status }: { status: ConnectionStatus }) => {
  const s = CONNECTION[status] ?? CONNECTION.not_configured
  return <StatusBadge color={s.color}>{s.label}</StatusBadge>
}

const SYNC: Record<string, { label: string; color: "green" | "red" | "orange" | "grey" | "blue" }> = {
  synced: { label: "Synced", color: "green" },
  error: { label: "Error", color: "red" },
  pending: { label: "Pending", color: "blue" },
  processing: { label: "Processing", color: "blue" },
  skipped: { label: "Skipped", color: "orange" },
  removed: { label: "Removed", color: "grey" },
}

export const SyncBadge = ({ status }: { status: string }) => {
  const s = SYNC[status] ?? { label: status, color: "grey" as const }
  return <StatusBadge color={s.color}>{s.label}</StatusBadge>
}

export const PROVIDER_LABELS: Record<string, string> = {
  google_merchant: "Google Merchant",
  meta: "Meta",
  tiktok_shop: "TikTok Shop",
  tiktok_events: "TikTok Pixel",
  google_analytics: "Google Analytics",
  sameday: "Sameday",
}

export const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleString("ro-RO") : "—")
