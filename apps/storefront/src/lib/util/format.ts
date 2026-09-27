import { LOCALE } from "../env"

const formatters = new Map<string, Intl.NumberFormat>()

/** Medusa v2 amounts are in major units (e.g. 129.99). */
export function formatMoney(amount: number | null | undefined, currency = "ron") {
  if (amount == null || Number.isNaN(Number(amount))) return ""
  const key = currency.toLowerCase()
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.NumberFormat(LOCALE, { style: "currency", currency: key.toUpperCase(), minimumFractionDigits: 2 })
    )
  }
  return formatters.get(key)!.format(Number(amount))
}

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "long" }) {
  if (!value) return ""
  return new Intl.DateTimeFormat(LOCALE, opts).format(new Date(value))
}

export const pluralRo = (n: number, one: string, few: string, many: string) =>
  n === 1 ? `${n} ${one}` : n === 0 || (n % 100 > 0 && n % 100 < 20) ? `${n} ${few}` : `${n} ${many}`
