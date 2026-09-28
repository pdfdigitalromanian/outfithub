import { test, expect } from "@playwright/test"

const widths = [375, 430, 768, 1024, 1440, 1920]

async function login(page: import("@playwright/test").Page) {
  await page.goto("/app/login", { timeout: 120_000 })
  await expect(page.locator("html")).toHaveAttribute("lang", "ro")
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(process.env.ADMIN_EMAIL!)
  await page.locator('input[type="password"]').fill(process.env.ADMIN_PASSWORD!)
  await expect(page.getByRole("button", { name: "Afișează parola" })).toBeVisible()
  await page.getByRole("button", { name: "Continuați cu e-mail" }).click()
  await expect(page).toHaveURL(/\/app\/orders$/)
}

test("Romanian draft/product creation and detail screens fit phones and tablets", async ({ page }) => {
  test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, "Provide a local admin account using ADMIN_EMAIL and ADMIN_PASSWORD")
  await login(page)
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto("/app/draft-orders/create")
  await expect(page.getByRole("heading", { name: "Creează comandă ciornă", exact: true })).toBeVisible()
  expect(await page.getByRole("dialog").evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0)
  await page.screenshot({ path: test.info().outputPath("draft-create-375.png") })
  await page.keyboard.press("Escape")

  await page.goto("/app/products")
  await page.getByRole("link", { name: "Creează", exact: true }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  expect(await page.getByRole("dialog").evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0)
  await page.screenshot({ path: test.info().outputPath("product-create-375.png") })
  await page.keyboard.press("Escape")

  // Check genuine product/order detail screens and their widgets without changing data.
  const products = await (await page.request.get("/admin/products?limit=1")).json()
  const orders = await (await page.request.get("/admin/orders?limit=1")).json()
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of [products.products?.[0]?.id && `products/${products.products[0].id}`, orders.orders?.[0]?.id && `orders/${orders.orders[0].id}`].filter(Boolean)) {
      await page.goto(`/app/${route}`)
      await expect(page.locator("main")).toBeVisible()
      await expect(page.locator("main h1, main h2").first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
      await page.screenshot({ path: test.info().outputPath(`${String(route).split('/')[0]}-detail-${width}.png`) })
    }
  }
})


test("Romanian admin fits phones, tablets and desktops, including drawers", async ({ page }) => {
  test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, "Provide a local admin account using ADMIN_EMAIL and ADMIN_PASSWORD")
  await login(page)

  await page.setViewportSize({ width: 375, height: 900 })
  await page.locator("button:visible").first().click()
  await page.getByRole("dialog").getByRole("button", { name: "Produse", exact: true }).click()
  await expect(page.getByRole("dialog").getByRole("link", { name: "Produse", exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)

  const routes = [
    ["products", "Produse"], ["orders", "Comenzi"], ["storefront", "Magazin online"],
    ["integrations", "Integrări"], ["channels", "Sincronizare canale"],
  ]
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    for (const [route, title] of routes) {
      await page.goto(`/app/${route}`)
      await expect(page.getByRole("heading", { name: title, exact: true }).first()).toBeVisible()
      const overflow = await page.evaluate(() => {
        const main = document.querySelector("main")!
        return { document: document.documentElement.scrollWidth - innerWidth, main: main.scrollWidth - main.clientWidth }
      })
      expect(overflow, `${route} at ${width}px`).toEqual({ document: 0, main: 0 })
    }
  }

  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/app/integrations")
    await page.getByRole("button", { name: "Configurează" }).first().click()
    const drawer = page.getByRole("dialog")
    await expect(drawer.getByRole("button", { name: "Salvează și verifică" })).toBeVisible()
    await expect(drawer.getByLabel("ID cont Merchant Center")).toBeVisible()
    expect(await drawer.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0)
    await page.screenshot({ path: test.info().outputPath(`integration-${width}.png`) })
    await page.keyboard.press("Escape")
    await expect(drawer).toHaveCount(0)

    await page.goto("/app/storefront")
    await page.getByRole("tab", { name: "Pagini și informații legale" }).click()
    await page.getByRole("button", { name: "Pagină nouă" }).click()
    await expect(drawer.getByRole("heading", { name: "Pagină nouă" })).toBeVisible()
    expect(await drawer.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0)
    await page.screenshot({ path: test.info().outputPath(`page-editor-${width}.png`) })
    await drawer.getByRole("button", { name: "Anulează" }).click()
    await expect(drawer).toHaveCount(0)
  }

  // Other native administration screens share the shell but have different forms/tables.
  await page.setViewportSize({ width: 375, height: 900 })
  for (const route of ["draft-orders", "inventory", "customers", "collections", "categories", "promotions", "price-lists", "settings/store", "settings/profile"]) {
    await page.goto(`/app/${route}`)
    await expect(page.locator("main h1, main h2").first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBe(0)
  }
})
