import { MedusaService } from "@medusajs/framework/utils"
import Wishlist from "./models/wishlist"
import WishlistItem from "./models/wishlist-item"

class WishlistModuleService extends MedusaService({ Wishlist, WishlistItem }) {
  async getOrCreateForCustomer(customer_id: string) {
    const [existing] = await this.listWishlists({ customer_id }, { relations: ["items"] })
    if (existing) {
      return existing
    }
    const created = await this.createWishlists({ customer_id })
    return { ...created, items: [] }
  }

  async addProducts(customer_id: string, product_ids: string[]) {
    const wishlist = await this.getOrCreateForCustomer(customer_id)
    const have = new Set(wishlist.items.map((i) => i.product_id))
    const toAdd = [...new Set(product_ids)].filter((id) => !have.has(id))
    if (toAdd.length) {
      await this.createWishlistItems(toAdd.map((product_id) => ({ product_id, wishlist_id: wishlist.id })))
    }
    return this.getOrCreateForCustomer(customer_id)
  }

  async removeProduct(customer_id: string, product_id: string) {
    const wishlist = await this.getOrCreateForCustomer(customer_id)
    const items = wishlist.items.filter((i) => i.product_id === product_id)
    if (items.length) {
      await this.deleteWishlistItems(items.map((i) => i.id))
    }
    return this.getOrCreateForCustomer(customer_id)
  }
}

export default WishlistModuleService
