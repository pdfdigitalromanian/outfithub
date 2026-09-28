/* OutfitHub service worker — hand-written, no build step.
 * - Static assets (/_next/static, fonts, icons): cache-first (immutable).
 * - Product images (/_next/image): stale-while-revalidate, capped.
 * - Page navigations: network-first, fall back to cache, then /offline.
 * - Never caches: /api, /checkout, /account, /cart, /order, server actions (POST).
 */
const VERSION = "oh-v2"
const STATIC = `${VERSION}-static`
const PAGES = `${VERSION}-pages`
const IMAGES = `${VERSION}-images`
const OFFLINE_URL = "/offline"
const PRIVATE = [/^\/wishlist(?:\/|$)/,/^\/api\//, /^\/checkout/, /^\/account/, /^\/cart/, /^\/order\//]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES).then((c) => c.addAll([OFFLINE_URL, "/"])).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("oh-") && !k.startsWith(`${VERSION}-`)).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  const removable = keys.filter((key) => new URL(key.url).pathname !== OFFLINE_URL)
  for (let i = 0; i < keys.length - max && i < removable.length; i++) await cache.delete(removable[i])
}

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (PRIVATE.some((rx) => rx.test(url.pathname))) return
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) return

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone()))
        return res
      }))
    )
    return
  }

  if (url.pathname.startsWith("/_next/image")) {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const hit = await cache.match(req)
        const network = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone()).then(() => trim(IMAGES, 150))
          return res
        }).catch(() => hit)
        return hit || network
      })
    )
    return
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic" && !res.redirected && !/private|no-store/i.test(res.headers.get("Cache-Control") || "")) caches.open(PAGES).then((c) => c.put(req, res.clone()).then(() => trim(PAGES, 40)))
          return res
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(OFFLINE_URL)))
    )
  }
})
