import { expect, test } from "@playwright/test"

const WIDTHS = [375, 430, 768, 1024, 1440, 1920]
const PUBLIC = ["/", "/shop", "/categories/tricouri", "/products/tricou-essential", "/cart", "/wishlist", "/pages/termeni-si-conditii", "/account/login", "/search?q=tricou"]

test.describe("no horizontal overflow", () => {
  test.skip(({ isMobile }) => !!isMobile, "viewport widths are set explicitly")

  for (const width of WIDTHS) {
    test(`public pages at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      for (const path of PUBLIC) {
        await page.goto(path)
        await page.waitForLoadState("networkidle")
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, `${path} overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(0)
      }
    })
  }

  test("account pages on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const email = `resp+${Date.now()}@example.com`
    await page.goto("/account/register")
    await page.getByLabel("Prenume").fill("Ana")
    await page.getByLabel(/^Nume/).fill("Pop")
    await page.getByLabel("E-mail").fill(email)
    await page.getByLabel("Parolă").fill("Parola-123456")
    await page.getByRole("checkbox", { name: /Sunt de acord/ }).check()
    await page.getByRole("button", { name: "Creează cont" }).click()
    await expect(page).toHaveURL(/\/account$/)
    for (const path of ["/account", "/account/orders", "/account/addresses", "/account/profile"]) {
      await page.goto(path)
      await page.waitForLoadState("networkidle")
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0)
    }
  })
})
