import { expect, test } from "@playwright/test"
import { acceptCookies, addFirstAvailableToCart } from "./helpers"

test.describe("catalog & SEO", () => {
  test("home renders hero, products and footer legal links", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.locator("main article").first()).toBeVisible()
    const footer = page.locator("footer")
    for (const text of ["Termeni și condiții", "Politica de confidențialitate", "Politica de cookies", "Informații ANPC"]) {
      await expect(footer.getByRole("link", { name: new RegExp(text) }).first()).toBeVisible()
    }
  })

  test("product page exposes metadata, canonical and Product JSON-LD", async ({ page }) => {
    await page.goto("/products/tricou-essential")
    await expect(page).toHaveTitle(/Tricou Essential/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/products\/tricou-essential$/)
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /https?:\/\//)
    const jsonld = await page.locator('script[type="application/ld+json"]').allTextContents()
    const types = jsonld.map((j) => JSON.parse(j)["@type"])
    expect(types).toEqual(expect.arrayContaining(["ProductGroup", "BreadcrumbList"]))
  })

  test("filters and search narrow the catalog", async ({ page }) => {
    await page.goto("/shop")
    const total = await page.locator("main article").count()
    await page.goto("/shop?category=tricouri")
    const filtered = await page.locator("main article").count()
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(total)
    await expect(page.locator("main article h3", { hasText: "Hanorac" })).toHaveCount(0)
    await page.goto("/search?q=hanorac")
    await expect(page.getByRole("heading", { name: "Hanorac Vintage" })).toBeVisible()
  })

  test("sitemap and robots are served", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml")
    expect(sitemap.ok()).toBeTruthy()
    expect(await sitemap.text()).toContain("/products/tricou-essential")
    const robots = await request.get("/robots.txt")
    expect(robots.ok()).toBeTruthy()
    const manifest = await request.get("/manifest.webmanifest")
    expect((await manifest.json()).display).toBe("standalone")
  })

  test("legal pages are reachable", async ({ page }) => {
    for (const handle of ["termeni-si-conditii", "politica-de-confidentialitate", "politica-cookies", "livrare", "retur", "anpc"]) {
      const res = await page.goto(`/pages/${handle}`)
      expect(res?.status()).toBe(200)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    }
  })
})

test.describe("cart & checkout", () => {
  test("wishlist toggles and persists", async ({ page }) => {
    await page.goto("/products/hanorac-vintage")
    await acceptCookies(page)
    await page.getByRole("button", { name: /Adaugă Hanorac Vintage la favorite/ }).first().click()
    await page.goto("/wishlist")
    await expect(page.getByRole("heading", { name: "Hanorac Vintage" })).toBeVisible()
  })

  test("guest can place a cash-on-delivery order", async ({ page }) => {
    await addFirstAvailableToCart(page)
    await page.goto("/checkout")
    // Wait until streamed server markup has been swapped in (hidden S:* containers removed).
    await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"]'))
    await page.getByLabel("E-mail").fill(`e2e+${Date.now()}@example.com`)
    await page.getByLabel("Prenume").fill("Ana")
    await page.getByLabel(/^Nume/).fill("Popescu")
    await page.getByLabel("Telefon").fill("0722123456")
    await page.getByLabel("Stradă, număr").fill("Strada Exemplu 10")
    await page.getByLabel("Localitate").fill("Cluj-Napoca")
    await page.getByLabel("Județ").selectOption("Cluj")
    await page.getByLabel("Cod poștal").fill("400001")
    await page.getByRole("button", { name: "Continuă spre livrare" }).click()
    await page.getByText("Curier Sameday la adresă").click()
    await page.getByRole("button", { name: "Continuă spre plată" }).click()
    await page.getByText("Plata la livrare (ramburs)").click()
    await page.getByRole("checkbox", { name: /Am citit și sunt de acord/ }).check()
    await page.getByRole("button", { name: /Plasează comanda/ }).click()
    await expect(page).toHaveURL(/\/order\/.+\/confirmed/, { timeout: 30_000 })
    await expect(page.getByRole("heading", { name: "Mulțumim!" })).toBeVisible()
  })
})
