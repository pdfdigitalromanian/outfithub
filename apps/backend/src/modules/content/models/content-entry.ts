import { model } from "@medusajs/framework/utils"

/**
 * Key/value store for editable site content: homepage blocks, company legal
 * information, social links, default SEO, announcement bar, shipping info.
 */
const ContentEntry = model.define("content_entry", {
  id: model.id({ prefix: "cnt" }).primaryKey(),
  key: model.text().unique(),
  value: model.json(),
})

export default ContentEntry
