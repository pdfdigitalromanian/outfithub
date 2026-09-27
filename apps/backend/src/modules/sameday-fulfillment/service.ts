import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CreateFulfillmentResult,
  FulfillmentOption,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"

export const SAMEDAY_HOME_OPTION = "sameday-home"
export const SAMEDAY_EASYBOX_OPTION = "sameday-easybox"

/**
 * Sameday fulfillment provider.
 *
 * Shipping option prices are configured in the admin (flat price, optionally
 * with conditional "free over X" rules). AWB creation, labels, tracking and
 * cancellation use the credentials stored in the Integrations module and run
 * in the `order.fulfillment_created` subscriber / admin routes, so this
 * provider stays free of credentials (module providers are isolated and
 * cannot resolve other modules).
 *
 * For Easybox, the canonical Sameday `locker_id` selected by the shopper is
 * required in the shipping method `data` and validated here.
 */
class SamedayFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "sameday"

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      { id: SAMEDAY_HOME_OPTION, name: "Sameday – livrare la adresă" },
      { id: SAMEDAY_EASYBOX_OPTION, name: "Sameday – Easybox" },
      { id: "sameday-return", name: "Sameday – retur", is_return: true },
    ]
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    if (optionData.id === SAMEDAY_EASYBOX_OPTION) {
      const lockerId = data?.locker_id
      if (lockerId === undefined || lockerId === null || String(lockerId).trim() === "" || !/^\d+$/.test(String(lockerId))) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Selectează un Easybox Sameday valid pentru a continua."
        )
      }
      return {
        type: "easybox",
        locker_id: String(lockerId),
        locker_name: typeof data.locker_name === "string" ? data.locker_name.slice(0, 200) : null,
        locker_address: typeof data.locker_address === "string" ? data.locker_address.slice(0, 300) : null,
        locker_city: typeof data.locker_city === "string" ? data.locker_city.slice(0, 120) : null,
      }
    }
    return { type: "home" }
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return [SAMEDAY_HOME_OPTION, SAMEDAY_EASYBOX_OPTION, "sameday-return"].includes(String(data.id))
  }

  async canCalculate(): Promise<boolean> {
    return false
  }

  async calculatePrice(): Promise<CalculatedShippingOptionPrice> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Sameday shipping options use flat prices configured in the admin."
    )
  }

  async createFulfillment(
    data: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    // The AWB is generated asynchronously by the fulfillment subscriber so a
    // courier API outage never blocks creating the fulfillment in Medusa.
    return {
      data: { ...data, awb_status: "pending" },
      labels: [],
    }
  }

  async cancelFulfillment(): Promise<Record<string, unknown>> {
    // AWB cancellation is performed by the `order.fulfillment_canceled` subscriber.
    return {}
  }

  async createReturnFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: { awb_status: "manual" }, labels: [] }
  }
}

export default SamedayFulfillmentProviderService
