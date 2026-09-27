import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { SEO_MODULE } from "../../modules/seo"
import type SeoModuleService from "../../modules/seo/service"
import { CONTENT_MODULE } from "../../modules/content"
import type ContentModuleService from "../../modules/content/service"
import { generateListingSeo, generateProductSeo, slugify } from "./generate"

/**
 * Generates SEO for a product. Also normalizes the handle to an ASCII slug
 * (Romanian diacritics removed) so URLs are clean and stable.
 */
export async function applyProductSeo(container: MedusaContainer, productId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)
  const seo = container.resolve<SeoModuleService>(SEO_MODULE)
  const content = container.resolve<ContentModuleService>(CONTENT_MODULE)

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "subtitle",
      "description",
      "handle",
      "thumbnail",
      "images.id",
      "images.url",
      "images.rank",
      "collection.title",
      "categories.name",
      "options.title",
      "options.values.value",
      "variants.sku",
      "variants.barcode",
      "variants.ean",
      "variants.upc",
    ],
    filters: { id: productId },
  })
  const product: any = data[0]
  if (!product) return null

  const cleanHandle = slugify(product.handle || product.title)
  if (cleanHandle && cleanHandle !== product.handle) {
    const [clash] = await productModule.listProducts({ handle: cleanHandle }, { take: 1, select: ["id"] })
    const handle = clash && clash.id !== product.id ? `${cleanHandle}-${product.id.slice(-5).toLowerCase()}` : cleanHandle
    await productModule.updateProducts(product.id, { handle })
    product.handle = handle
  }

  const templates = await content.getValue("seo")
  const images = [...(product.images ?? [])].sort((a: any, b: any) => (a.rank ?? 0) - (b.rank ?? 0))
  const generated = generateProductSeo({ ...product, images }, templates as any)
  return seo.applyGenerated("product", product.id, generated)
}

export async function applyCollectionSeo(container: MedusaContainer, id: string) {
  const productModule = container.resolve(Modules.PRODUCT)
  const seo = container.resolve<SeoModuleService>(SEO_MODULE)
  const [c] = await productModule.listProductCollections({ id }, { take: 1 })
  if (!c) return null
  const description = (c.metadata as any)?.description as string | undefined
  return seo.applyGenerated("collection", c.id, generateListingSeo({ title: c.title, handle: c.handle, description, kind: "collection" }))
}

export async function applyCategorySeo(container: MedusaContainer, id: string) {
  const productModule = container.resolve(Modules.PRODUCT)
  const seo = container.resolve<SeoModuleService>(SEO_MODULE)
  const [c] = await productModule.listProductCategories({ id }, { take: 1 })
  if (!c) return null
  const handle = slugify(c.handle || c.name)
  if (handle !== c.handle) await productModule.updateProductCategories(c.id, { handle })
  return seo.applyGenerated("category", c.id, generateListingSeo({ title: c.name, handle, description: c.description, kind: "category" }))
}
