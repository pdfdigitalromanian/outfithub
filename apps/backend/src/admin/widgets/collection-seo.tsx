import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminCollection, DetailWidgetProps } from "@medusajs/framework/types"
import { SeoPanel } from "../components/seo-panel"

const CollectionSeoWidget = ({ data }: DetailWidgetProps<AdminCollection>) => (
  <SeoPanel type="collection" id={data.id} storefrontPath={`/collections/${data.handle}`} />
)

export const config = defineWidgetConfig({ zone: "product_collection.details.after" })

export default CollectionSeoWidget
