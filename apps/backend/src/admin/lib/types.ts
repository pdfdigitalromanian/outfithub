export type ConnectionStatus = "not_configured" | "authorization_required" | "connected" | "error"

export type IntegrationField = {
  key: string
  label: string
  type: "text" | "password" | "textarea" | "select" | "boolean" | "number"
  required?: boolean
  secret?: boolean
  public?: boolean
  help?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  default?: string | number | boolean
}

export type Integration = {
  provider: string
  name: string
  category: string
  description: string
  docs_url: string
  oauth?: boolean
  fields: IntegrationField[]
  enabled: boolean
  status: ConnectionStatus
  status_message: string | null
  last_checked_at: string | null
  config: Record<string, any>
  secrets: Record<string, string | null>
  missing_fields: string[]
}

export type ChannelSync = {
  id: string
  provider: string
  product_id: string
  action: "upsert" | "delete"
  status: "pending" | "processing" | "synced" | "error" | "skipped" | "removed"
  external_id: string | null
  attempts: number
  last_error: string | null
  issues: Array<{ severity: string; code: string; message: string }> | null
  last_synced_at: string | null
  next_attempt_at: string | null
  updated_at: string
  product: { id: string; title: string; handle: string; thumbnail: string | null } | null
}
