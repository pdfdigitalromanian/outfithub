import { describe, expect, it } from "vitest"
import { safeReturnPath, validEmail, validPassword } from "../../src/lib/util/account-validation"

describe("account input boundaries", () => {
  it.each(["//evil.example", "/\\evil.example", "https://evil.example", "/\nevil.example", "javascript:alert(1)"])("rejects unsafe return path %j", (path) => {
    expect(safeReturnPath(path)).toBe("/account")
  })
  it("preserves internal paths and query strings", () => {
    expect(safeReturnPath("/checkout?from=account#payment")).toBe("/checkout?from=account#payment")
  })
  it("bounds account input without stripping password whitespace", () => {
    expect(validPassword("        ")).toBe(true)
    expect(validPassword("a".repeat(129))).toBe(false)
    expect(validEmail("invalid")).toBe(false)
    expect(validEmail("ana@example.com")).toBe(true)
    expect(validEmail("a".repeat(250) + "@example.com")).toBe(false)
  })
})
