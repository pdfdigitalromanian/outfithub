import { model } from "@medusajs/framework/utils"

/**
 * Synchronization state of one product on one external sales channel
 * (google_merchant, meta_catalog, tiktok_shop).
 */
const ChannelSync = model
  .define("channel_sync", {
    id: model.id({ prefix: "chsync" }).primaryKey(),
    provider: model.text(),
    product_id: model.text(),
    action: model.enum(["upsert", "delete"]).default("upsert"),
    status: model
      .enum(["pending", "processing", "synced", "error", "skipped", "removed"])
      .default("pending"),
    external_id: model.text().nullable(),
    external_data: model.json().nullable(),
    payload_hash: model.text().nullable(),
    attempts: model.number().default(0),
    last_error: model.text().nullable(),
    issues: model.json().nullable(),
    last_synced_at: model.dateTime().nullable(),
    next_attempt_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["provider", "product_id"], unique: true },
    { on: ["status", "next_attempt_at"] },
  ])

export default ChannelSync
