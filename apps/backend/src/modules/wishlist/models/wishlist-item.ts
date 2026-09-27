import { model } from "@medusajs/framework/utils"
import Wishlist from "./wishlist"

const WishlistItem = model
  .define("wishlist_item", {
    id: model.id({ prefix: "wli" }).primaryKey(),
    product_id: model.text(),
    variant_id: model.text().nullable(),
    wishlist: model.belongsTo(() => Wishlist, { mappedBy: "items" }),
  })
  .indexes([{ on: ["wishlist_id", "product_id"], unique: true }])

export default WishlistItem
