import { test, expect } from "@playwright/test"
import { acceptCookies } from "./helpers"

test("search clears old suggestions and exposes a recoverable error", async ({ page }) => {
  await page.goto("/")
  await acceptCookies(page)
  await page.getByRole("button", { name: /Caută/ }).first().click()
  const input = page.getByRole("combobox", { name: "Termen de căutare" })
  await input.fill("hanorac")
  await expect(page.getByRole("option").first()).toBeVisible()
  await input.fill("h")
  await expect(page.getByRole("option")).toHaveCount(0)
  await page.route("**/api/search?*", (route) => route.fulfill({ status: 503, body: "{}" }))
  await input.fill("tricou")
  await expect(page.getByRole("status")).toContainText("nu este disponibilă")
  await expect(page.getByRole("option")).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("payment return never trusts a successful URL parameter", async ({ page }) => {
  await page.goto("/checkout/return?redirect_status=succeeded&payment_intent_client_secret=fake")
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Coșul a expirat")
  await expect(page).toHaveURL(/\/checkout\/return$/)
  await expect(page.getByRole("button", { name: "Verifică din nou" })).toBeVisible()
})
