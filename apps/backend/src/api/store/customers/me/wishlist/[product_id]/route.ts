import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../../../modules/wishlist"
import type WishlistModuleService from "../../../../../../modules/wishlist/service"

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
  const wishlist = await svc.removeProduct(req.auth_context.actor_id, req.params.product_id)
  res.json({ wishlist: { id: wishlist.id, product_ids: wishlist.items.map((i) => i.product_id) } })
}
