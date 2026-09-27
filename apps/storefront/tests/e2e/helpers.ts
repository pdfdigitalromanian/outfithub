import type { Page } from "@playwright/test"

export async function acceptCookies(page: Page) {
  const btn = page.getByRole("region", { name: "Consimțământ cookie-uri" }).getByRole("button", { name: "Accept tot" })
  await btn.waitFor({ timeout: 5000 }).catch(() => undefined)
  if (await btn.isVisible().catch(() => false)) await btn.click()
}

export async function addFirstAvailableToCart(page: Page, handle = "tricou-essential") {
  await page.goto(`/products/${handle}`)
  await acceptCookies(page)
  const sizes = page.getByRole("button", { name: /^Mărime \S+( – indisponibil)?$/ })
  const count = await sizes.count()
  for (let i = 0; i < count; i++) {
    const label = (await sizes.nth(i).getAttribute("aria-label")) ?? ""
    if (!label.includes("indisponibil")) {
      await sizes.nth(i).click()
      break
    }
  }
  await page.getByRole("button", { name: "Adaugă în coș" }).first().click()
  await page.getByRole("dialog", { name: /Coșul tău/ }).waitFor()
}
