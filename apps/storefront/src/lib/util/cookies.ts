import "server-only"
import { cookies } from "next/headers"

const secure = process.env.NODE_ENV === "production"
export const CART_COOKIE = "_medusa_cart_id"
export const JWT_COOKIE = "_medusa_jwt"

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(JWT_COOKIE)?.value
  return token ? { authorization: `Bearer ${token}` } : {}
}

export async function setAuthToken(token: string) {
  ;(await cookies()).set(JWT_COOKIE, token, { maxAge: 60 * 60 * 24 * 7, httpOnly: true, sameSite: "lax", secure, path: "/" })
}

export async function removeAuthToken() {
  ;(await cookies()).delete(JWT_COOKIE)
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
