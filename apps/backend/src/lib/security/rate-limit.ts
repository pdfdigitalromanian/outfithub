import { createHmac } from "node:crypto"
import Redis from "ioredis"
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"

export type Counter = (key: string, windowMs: number) => Promise<{ count: number; ttl: number }>
// INCR + expiry are one atomic operation, including concurrent first requests.
const SCRIPT = `local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { n, redis.call('PTTL', KEYS[1]) }`
let redis: Redis | undefined
const memory = new Map<string, { count: number; expires: number }>()

export const increment: Counter = async (key, windowMs) => {
  if (process.env.REDIS_URL) {
    if (!redis) {
      redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 2000, commandTimeout: 2000, enableOfflineQueue: true })
      redis.on("error", () => { /* Requests fail closed below; never log connection credentials. */ })
    }
    const [count, ttl] = await redis.eval(SCRIPT, 1, key, windowMs) as [number, number]
    return { count, ttl }
  }
  if (process.env.NODE_ENV === "production") throw new Error("Rate limiting requires Redis")
  const now = Date.now()
  for (const [k, v] of memory) if (v.expires <= now) memory.delete(k)
  if (memory.size >= 10000 && !memory.has(key)) throw new Error("Rate limiter capacity reached")
  const value = memory.get(key) ?? { count: 0, expires: now + windowMs }
  value.count++
  memory.set(key, value)
  return { count: value.count, ttl: value.expires - now }
}

/** Email limits survive IP rotation; socket limits ignore spoofable forwarding headers.
 * A storefront server shares its socket bucket, so this is deliberately generous.
 * Use an edge WAF for per-shopper IP protection in addition to these account limits.
 */
export function authRateLimit(counter: Counter = increment) {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    if (req.method !== "POST") return next()
    const body = req.body as { email?: unknown; identifier?: unknown } | undefined
    const identity = String(body?.email ?? body?.identifier ?? "").trim().toLowerCase().slice(0, 254)
    const hash = (value: string) => createHmac("sha256", process.env.JWT_SECRET || "local-development").update(value).digest("hex")
    const limits = [
      { key: `oh:auth:socket:${hash(req.socket.remoteAddress || "unknown")}`, max: 300, window: 60_000 },
      ...(identity ? [{ key: `oh:auth:identity:${hash(identity)}`, max: 20, window: 15 * 60_000 }] : []),
    ]
    try {
      for (const limit of limits) {
        const { count, ttl } = await counter(limit.key, limit.window)
        if (count > limit.max) {
          res.setHeader("Retry-After", String(Math.max(1, Math.ceil(ttl / 1000))))
          res.setHeader("Cache-Control", "no-store")
          res.status(429).json({ type: "too_many_requests", message: "Prea multe încercări. Încearcă din nou mai târziu." })
          return
        }
      }
      next()
    } catch {
      res.setHeader("Retry-After", "5")
      res.status(503).json({ type: "unavailable", message: "Autentificarea nu este disponibilă momentan. Încearcă din nou." })
    }
  }
}
