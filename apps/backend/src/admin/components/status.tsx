import { StatusBadge } from "@medusajs/ui"
import type { ConnectionStatus } from "../lib/types"

const CONNECTION: Record<ConnectionStatus, { label: string; color: "green" | "red" | "orange" | "grey" }> = {
  connected: { label: "Conectat", color: "green" },
  error: { label: "Eroare", color: "red" },
  authorization_required: { label: "Autorizare necesară", color: "orange" },
  not_configured: { label: "Neconfigurat", color: "grey" },
}

export const ConnectionBadge = ({ status }: { status: ConnectionStatus }) => {
  const s = CONNECTION[status] ?? CONNECTION.not_configured
  return <StatusBadge color={s.color}>{s.label}</StatusBadge>
}

const SYNC: Record<string, { label: string; color: "green" | "red" | "orange" | "grey" | "blue" }> = {
  synced: { label: "Sincronizat", color: "green" },
  error: { label: "Eroare", color: "red" },
  pending: { label: "În așteptare", color: "blue" },
  processing: { label: "În curs", color: "blue" },
  skipped: { label: "Omis", color: "orange" },
  removed: { label: "Eliminat", color: "grey" },
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

export const syncLabel = (status: string) => SYNC[status]?.label ?? status
