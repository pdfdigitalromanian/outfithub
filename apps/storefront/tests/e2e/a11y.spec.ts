import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { acceptCookies } from "./helpers"

const PAGES = ["/", "/shop", "/products/tricou-essential", "/cart", "/pages/termeni-si-conditii", "/account/login", "/wishlist"]

for (const path of PAGES) {
  test(`no serious a11y violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    await acceptCookies(page)
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
  })
}

test("cookie banner is keyboard operable", async ({ page }) => {
  await page.goto("/pages/politica-cookies")
  const region = page.getByRole("region", { name: "Consimțământ cookie-uri" })
  await expect(region).toBeVisible()
  await region.getByRole("button", { name: "Personalizează" }).focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Setări cookie" })
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
})
