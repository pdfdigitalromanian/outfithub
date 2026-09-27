import { model } from "@medusajs/framework/utils"

/**
 * SEO metadata for a product, collection or category. Values are generated
 * automatically; any field listed in `manual_fields` was edited by an admin and
 * is never overwritten by the generator.
 */
const SeoEntry = model
  .define("seo_entry", {
    id: model.id({ prefix: "seo" }).primaryKey(),
    resource_type: model.enum(["product", "collection", "category"]),
    resource_id: model.text(),
    meta_title: model.text().nullable(),
    meta_description: model.text().nullable(),
    og_image: model.text().nullable(),
    canonical_path: model.text().nullable(),
    image_alts: model.json().nullable(),
    noindex: model.boolean().default(false),
    manual_fields: model.json().nullable(),
    issues: model.json().nullable(),
    generated_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["resource_type", "resource_id"], unique: true }])

export default SeoEntry
