import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../../modules/wishlist"
import type WishlistModuleService from "../../../../../modules/wishlist/service"
import type { PostWishlistBody } from "../../../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
  const wishlist = await svc.getOrCreateForCustomer(req.auth_context.actor_id)
  res.json({ wishlist: { id: wishlist.id, product_ids: wishlist.items.map((i) => i.product_id) } })
}

/** Adds one or more products (also used to merge a guest wishlist on login). */
export async function POST(req: AuthenticatedMedusaRequest<PostWishlistBody>, res: MedusaResponse) {
  const svc = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
  const wishlist = await svc.addProducts(req.auth_context.actor_id, req.validatedBody.product_ids)
  res.json({ wishlist: { id: wishlist.id, product_ids: wishlist.items.map((i) => i.product_id) } })
}
