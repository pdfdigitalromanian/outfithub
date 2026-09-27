import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProductCategory, DetailWidgetProps } from "@medusajs/framework/types"
import { SeoPanel } from "../components/seo-panel"

const CategorySeoWidget = ({ data }: DetailWidgetProps<AdminProductCategory>) => (
  <SeoPanel type="category" id={data.id} storefrontPath={`/categories/${data.handle}`} />
)

export const config = defineWidgetConfig({ zone: "product_category.details.side.after" })

export default CategorySeoWidget
