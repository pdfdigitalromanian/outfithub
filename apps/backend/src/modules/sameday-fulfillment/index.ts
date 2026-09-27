import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import SamedayFulfillmentProviderService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [SamedayFulfillmentProviderService],
})
