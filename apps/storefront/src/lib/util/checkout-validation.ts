import { RO_COUNTIES } from "../ro-counties"

export function validCheckoutAddress(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const a = value as Record<string, unknown>
  const field = (key: string) => typeof a[key] === "string" ? (a[key] as string).trim() : ""
  return !!field("first_name") && field("first_name").length <= 100
    && !!field("last_name") && field("last_name").length <= 100
    && /^(\+?40|0)\d{9}$/.test(field("phone").replace(/[\s.-]/g, ""))
    && field("address_1").length >= 5 && field("address_1").length <= 200
    && !!field("city") && field("city").length <= 100
    && RO_COUNTIES.includes(field("province"))
    && (!field("postal_code") || /^\d{6}$/.test(field("postal_code")))
}
