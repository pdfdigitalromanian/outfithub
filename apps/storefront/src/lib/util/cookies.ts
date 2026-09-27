import "server-only"
import { cookies } from "next/headers"

const secure = process.env.NODE_ENV === "production"
export const CART_COOKIE = "_medusa_cart_id"
export const JWT_COOKIE = "_medusa_jwt"

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(JWT_COOKIE)?.value
  return token ? { authorization: `Bearer ${token}` } : {}
}

/** Non-sensitive flag readable by client JS so UI can react to login/logout. */
export const AUTH_FLAG_COOKIE = "oh_auth"

export async function setAuthToken(token: string) {
  const jar = await cookies()
  jar.set(JWT_COOKIE, token, { maxAge: 60 * 60 * 24 * 7, httpOnly: true, sameSite: "lax", secure, path: "/" })
  jar.set(AUTH_FLAG_COOKIE, String(Date.now()), { maxAge: 60 * 60 * 24 * 7, httpOnly: false, sameSite: "lax", secure, path: "/" })
}

export async function removeAuthToken() {
  const jar = await cookies()
  jar.delete(JWT_COOKIE)
  jar.delete(AUTH_FLAG_COOKIE)
}

export async function getCartId() {
  return (await cookies()).get(CART_COOKIE)?.value
}

export async function setCartId(id: string) {
  ;(await cookies()).set(CART_COOKIE, id, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax", secure, path: "/" })
}

export async function removeCartId() {
  ;(await cookies()).delete(CART_COOKIE)
}
