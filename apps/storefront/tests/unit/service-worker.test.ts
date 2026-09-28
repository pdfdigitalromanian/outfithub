import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

function worker() {
  const listeners: Record<string, (event: any) => void> = {}
  const caches = { keys: vi.fn(async () => ["oh-v1-static", "oh-v2-static", "another-app"]), delete: vi.fn(async () => true) }
  const context = { URL, caches, self: { location: { origin: "https://shop.example" }, addEventListener: (event: string, fn: any) => { listeners[event] = fn }, clients: { claim: vi.fn() } } }
  runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), context)
  return { listeners, caches }
}

describe("service-worker privacy", () => {
  it.each(["/wishlist", "/account", "/checkout/return", "/cart", "/order/order_123/confirmed", "/api/search"])("never intercepts %s", (path) => {
    const { listeners } = worker()
    const respondWith = vi.fn()
    listeners.fetch({ request: { method: "GET", url: `https://shop.example${path}` }, respondWith })
    expect(respondWith).not.toHaveBeenCalled()
  })
  it("only removes old OutfitHub caches", async () => {
    const { listeners, caches } = worker()
    let task: Promise<unknown> | undefined
    listeners.activate({ waitUntil: (value: Promise<unknown>) => { task = value } })
    await task
    expect(caches.delete).toHaveBeenCalledTimes(1)
    expect(caches.delete).toHaveBeenCalledWith("oh-v1-static")
  })
})
