import { model } from "@medusajs/framework/utils"

const SamedayShipment = model
  .define("sameday_shipment", {
    id: model.id({ prefix: "sdsh" }).primaryKey(),
    order_id: model.text(),
    fulfillment_id: model.text().nullable(),
    awb_number: model.text().nullable(),
    awb_cost: model.float().nullable(),
    service_id: model.number().nullable(),
    locker_id: model.text().nullable(),
    parcels: model.json().nullable(),
    status: model
      .enum(["pending", "created", "in_transit", "delivered", "canceled", "error", "returned"])
      .default("pending"),
    status_label: model.text().nullable(),
    history: model.json().nullable(),
    last_error: model.text().nullable(),
  })
  .indexes([{ on: ["order_id"] }, { on: ["awb_number"] }])

export default SamedayShipment
