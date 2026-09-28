/** Providers sometimes echo rejected credentials in error messages. */
export function redactSecrets(message: string, secrets: Record<string, unknown>): string {
  const values: string[] = []
  const collect = (value: unknown) => {
    if (typeof value === "string" && value.length) {
      values.push(value, encodeURIComponent(value))
      if (value.startsWith("{")) { try { collect(JSON.parse(value)) } catch { /* not JSON */ } }
    } else if (value && typeof value === "object") Object.values(value).forEach(collect)
  }
  collect(secrets)
  let safe = message
  for (const value of [...new Set(values)].sort((a, b) => b.length - a.length)) safe = safe.split(value).join("[redacted]")
  return safe
}
