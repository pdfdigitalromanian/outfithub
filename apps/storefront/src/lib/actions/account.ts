"use server"

import { redirect } from "next/navigation"
import { safeReturnPath, validEmail, validPassword } from "../util/account-validation"
import { sdk } from "../medusa"
import { getAuthHeaders, getCartId, removeAuthToken, setAuthToken } from "../util/cookies"
import type { AddressInput } from "./cart"

/** `fields` echoes submitted (non-secret) values so forms keep them after an error. */
export type FormState = { error?: string; success?: string; fields?: Record<string, string> } | null

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim()

async function transferCart() {
  const cartId = await getCartId()
  if (cartId) await sdk.store.cart.transferCart(cartId, {}, await getAuthHeaders()).catch(() => null)
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase()
  const password = String(fd.get("password") ?? "")
  const fields = { email }
  if (!validEmail(email) || !password || password.length > 128) return { error: "Completează e-mailul și parola.", fields }
  try {
    const token = await sdk.auth.login("customer", "emailpass", { email, password })
    if (typeof token !== "string") return { error: "Autentificarea necesită un pas suplimentar care nu este suportat.", fields }
    await setAuthToken(token)
    await transferCart()
  } catch {
    return { error: "E-mail sau parolă incorecte.", fields }
  }
  const next = str(fd, "next")
  redirect(safeReturnPath(next))
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase()
  const password = String(fd.get("password") ?? "")
  const first_name = str(fd, "first_name")
  const last_name = str(fd, "last_name")
  const fields = { email, first_name, last_name }
  if (!validEmail(email) || !first_name || !last_name || first_name.length > 100 || last_name.length > 100) return { error: "Completează toate câmpurile obligatorii.", fields }
  if (!validPassword(password)) return { error: "Parola trebuie să aibă între 8 și 128 de caractere.", fields }
  if (fd.get("terms") !== "on") return { error: "Trebuie să accepți termenii și condițiile.", fields }
  try {
    const regToken = await sdk.auth.register("customer", "emailpass", { email, password })
    await sdk.store.customer.create({ email, first_name, last_name }, {}, { authorization: `Bearer ${regToken}` })
    const token = await sdk.auth.login("customer", "emailpass", { email, password })
    if (typeof token === "string") await setAuthToken(token)
    await transferCart()
  } catch (e) {
    const msg = (e as Error).message ?? ""
    return { error: /exist/i.test(msg) ? "Există deja un cont cu acest e-mail." : "Contul nu a putut fi creat.", fields }
  }
  redirect("/account")
}

export async function logoutAction() {
  await sdk.auth.logout().catch(() => null)
  await removeAuthToken()
  redirect("/")
}

export async function requestPasswordResetAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase()
  if (!validEmail(email)) return { error: "Introdu adresa de e-mail." }
  await sdk.auth.resetPassword("customer", "emailpass", { identifier: email }).catch(() => null)
  // Same answer whether or not the account exists (no account enumeration).
  return { success: "Dacă există un cont pentru această adresă, vei primi un e-mail cu instrucțiuni." }
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token")
  const password = String(fd.get("password") ?? "")
  if (!validPassword(password)) return { error: "Parola trebuie să aibă între 8 și 128 de caractere." }
  try {
    await sdk.auth.updateProvider("customer", "emailpass", { password }, token)
  } catch {
    return { error: "Linkul a expirat sau nu este valid." }
  }
  return { success: "Parola a fost schimbată. Te poți autentifica." }
}

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await sdk.store.customer.update(
      { first_name: str(fd, "first_name"), last_name: str(fd, "last_name"), phone: str(fd, "phone") },
      {},
      await getAuthHeaders()
    )
    return { success: "Datele au fost salvate." }
  } catch {
    return { error: "Nu am putut salva datele." }
  }
}

export async function saveAddressAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id")
  const body: AddressInput & { is_default_shipping?: boolean } = {
    first_name: str(fd, "first_name"),
    last_name: str(fd, "last_name"),
    phone: str(fd, "phone"),
    address_1: str(fd, "address_1"),
    address_2: str(fd, "address_2"),
    city: str(fd, "city"),
    province: str(fd, "province"),
    postal_code: str(fd, "postal_code"),
    company: str(fd, "company"),
    country_code: "ro",
    is_default_shipping: fd.get("is_default_shipping") === "on",
  }
  if (!body.first_name || !body.address_1 || !body.city || !body.province) return { error: "Completează câmpurile obligatorii." }
  try {
    if (id) await sdk.store.customer.updateAddress(id, body, {}, await getAuthHeaders())
    else await sdk.store.customer.createAddress(body, {}, await getAuthHeaders())
    return { success: "Adresa a fost salvată." }
  } catch {
    return { error: "Nu am putut salva adresa." }
  }
}

export async function deleteAddressAction(id: string) {
  await sdk.store.customer.deleteAddress(id, await getAuthHeaders()).catch(() => null)
}
