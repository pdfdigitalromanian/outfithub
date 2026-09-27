import { model } from "@medusajs/framework/utils"

/**
 * Editable static pages (Terms, Privacy, Cookies, Shipping, Returns, ANPC…).
 * `body` is Markdown.
 */
const ContentPage = model.define("content_page", {
  id: model.id({ prefix: "page" }).primaryKey(),
  handle: model.text().unique(),
  title: model.text(),
  body: model.text(),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  is_legal: model.boolean().default(false),
  published: model.boolean().default(true),
})

export default ContentPage
