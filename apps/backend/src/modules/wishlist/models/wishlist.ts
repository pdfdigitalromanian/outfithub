import { model } from "@medusajs/framework/utils"
import WishlistItem from "./wishlist-item"

const Wishlist = model.define("wishlist", {
  id: model.id({ prefix: "wl" }).primaryKey(),
  customer_id: model.text().unique(),
  items: model.hasMany(() => WishlistItem, { mappedBy: "wishlist" }),
}).cascades({ delete: ["items"] })

export default Wishlist
