/** Keep return URLs on this origin, including browser-normalized backslashes. */
export function safeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return "/account"
  try {
    const base = "https://outfithub.invalid"
    const url = new URL(value, base)
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/account"
  } catch {
    return "/account"
  }
}

export function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 128
}
