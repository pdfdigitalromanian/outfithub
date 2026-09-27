import { expect, test } from "@playwright/test"
import { acceptCookies } from "./helpers"

test("customer can register, sync wishlist, log out and log back in", async ({ page }) => {
  const email = `cont+${Date.now()}@example.com`
  const password = "Parola-sigura-123"

  // Guest wishlist first — it must be merged into the account after registration.
  await page.goto("/products/pantaloni-jogger")
  await acceptCookies(page)
  await page.getByRole("button", { name: /Adaugă Pantaloni Jogger la favorite/ }).first().click()

  await page.goto("/account/register")
  await page.getByLabel("Prenume").fill("Maria")
  await page.getByLabel(/^Nume/).fill("Ionescu")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Parolă").fill(password)
  await page.getByRole("checkbox", { name: /Sunt de acord/ }).check()
  await page.getByRole("button", { name: "Creează cont" }).click()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.getByRole("heading", { name: "Salut, Maria" })).toBeVisible()

  // Wishlist merged server-side: visible after clearing local storage.
  await page.evaluate(() => localStorage.removeItem("oh_wishlist"))
  await page.goto("/wishlist")
  await expect(page.getByRole("heading", { name: "Pantaloni Jogger" })).toBeVisible()

  await page.goto("/account/addresses")
  await page.getByRole("button", { name: "Adaugă adresă" }).click()
  const dialog = page.getByRole("dialog", { name: "Adresă nouă" })
  await dialog.getByLabel("Prenume").fill("Maria")
  await dialog.getByLabel(/^Nume/).fill("Ionescu")
  await dialog.getByLabel("Telefon").fill("0744555666")
  await dialog.getByLabel("Stradă, număr").fill("Bulevardul Unirii 1")
  await dialog.getByLabel("Localitate").fill("București")
  await dialog.getByLabel("Județ").selectOption("București")
  await dialog.getByRole("button", { name: "Salvează adresa" }).click()
  await expect(page.getByText("Bulevardul Unirii 1")).toBeVisible()

  await page.getByRole("button", { name: "Deconectare" }).first().click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto("/account")
  await expect(page).toHaveURL(/\/account\/login/)

  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Parolă").fill("gresita-123")
  await page.getByRole("button", { name: "Autentificare" }).click()
  await expect(page.getByText("E-mail sau parolă incorecte.")).toBeVisible()
  await page.getByLabel("Parolă").fill(password)
  await page.getByRole("button", { name: "Autentificare" }).click()
  await expect(page).toHaveURL(/\/account$/)
})
