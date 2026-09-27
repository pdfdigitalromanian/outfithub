import { model } from "@medusajs/framework/utils"

/**
 * One row per external provider. Secrets are stored AES-256-GCM encrypted in
 * `secrets_encrypted` and are never returned by any API route.
 */
const IntegrationConnection = model.define("integration_connection", {
  id: model.id({ prefix: "intc" }).primaryKey(),
  provider: model.text().unique(),
  enabled: model.boolean().default(false),
  config: model.json().nullable(),
  secrets_encrypted: model.text().nullable(),
  status: model
    .enum(["not_configured", "authorization_required", "connected", "error"])
    .default("not_configured"),
  status_message: model.text().nullable(),
  last_checked_at: model.dateTime().nullable(),
})

export default IntegrationConnection
