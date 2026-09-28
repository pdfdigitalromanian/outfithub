import { describe, it, expect } from "vitest"
import { validCheckoutAddress } from "../../src/lib/util/checkout-validation"
const address = { first_name: "Ana", last_name: "Popescu", phone: "0722 123 456", address_1: "Strada Exemplu 10", city: "Cluj-Napoca", province: "Cluj", postal_code: "400001" }
describe("server checkout validation", () => {
  it("accepts Romanian addresses", () => expect(validCheckoutAddress(address)).toBe(true))
  it.each([null, {}, { ...address, phone: "12" }, { ...address, province: "unknown" }, { ...address, first_name: "" }, { ...address, postal_code: "x" }])("rejects incomplete or invalid address %j", (input) => expect(validCheckoutAddress(input)).toBe(false))
})
