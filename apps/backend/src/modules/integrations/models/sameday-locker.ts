import { model } from "@medusajs/framework/utils"

/**
 * Cached copy of Sameday Easybox lockers / out-of-home points. `locker_id` is
 * the canonical Sameday identifier sent back as `lockerLastMile` on AWB creation.
 */
const SamedayLocker = model
  .define("sameday_locker", {
    id: model.id({ prefix: "sdlk" }).primaryKey(),
    locker_id: model.text().unique(),
    name: model.text(),
    type: model.text().default("locker"),
    county: model.text().nullable(),
    city: model.text().nullable(),
    address: model.text().nullable(),
    postal_code: model.text().nullable(),
    lat: model.float().nullable(),
    lng: model.float().nullable(),
    schedule: model.json().nullable(),
    search_text: model.text(),
  })
  .indexes([{ on: ["city"] }])

export default SamedayLocker
