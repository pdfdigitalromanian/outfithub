import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { SEO_MODULE } from "../../../../../modules/seo"
import type SeoModuleService from "../../../../../modules/seo/service"

/**
 * SEO metadata by resource handle, so the storefront can request it in
 * parallel with the product/collection itself.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { type, handle } = req.params
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const seo = req.scope.resolve<SeoModuleService>(SEO_MODULE)
  let id: string | undefined
  if (type === "product") {
    id = (await productModule.listProducts({ handle, status: "published" }, { take: 1, select: ["id"] }))[0]?.id
  } else if (type === "collection") {
    id = (await productModule.listProductCollections({ handle }, { take: 1, select: ["id"] }))[0]?.id
  } else if (type === "category") {
    id = (await productModule.listProductCategories({ handle, is_active: true, is_internal: false }, { take: 1, select: ["id"] }))[0]?.id
  } else {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Unknown resource type")
  }
  if (!id) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Not found")
  const entry = await seo.getFor(type as "product" | "collection" | "category", id)
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600")
  res.json({
    seo: entry
      ? {
          meta_title: entry.meta_title,
          meta_description: entry.meta_description,
          og_image: entry.og_image,
          canonical_path: entry.canonical_path,
          image_alts: entry.image_alts ?? {},
          noindex: entry.noindex,
        }
      : null,
  })
}
