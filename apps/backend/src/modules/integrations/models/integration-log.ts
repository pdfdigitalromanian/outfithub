import { model } from "@medusajs/framework/utils"

const IntegrationLog = model
  .define("integration_log", {
    id: model.id({ prefix: "ilog" }).primaryKey(),
    provider: model.text(),
    level: model.enum(["info", "warn", "error"]).default("info"),
    message: model.text(),
    context: model.json().nullable(),
  })
  .indexes([{ on: ["provider", "created_at"] }])

export default IntegrationLog
