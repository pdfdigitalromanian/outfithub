import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INTEGRATIONS_MODULE } from "../../../../modules/integrations"
import type IntegrationsModuleService from "../../../../modules/integrations/service"
import { normalize } from "../../../../lib/shipping/sameday-service"
import type { GetLockersQuery } from "../../../validators"

/**
 * Searchable Easybox list for the checkout selector. Returns
 * `available: false` when Sameday is not configured or the cache is empty,
 * so the storefront can hide the Easybox option instead of failing.
 */
export async function GET(req: MedusaRequest<unknown, GetLockersQuery>, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const integ = await svc.resolveIntegration("sameday")
  if (!integ.enabled || integ.status !== "connected") {
    return res.json({ available: false, lockers: [], count: 0 })
  }
  const { q, city, lat, lng, limit } = req.validatedQuery as unknown as GetLockersQuery
  const filters: Record<string, unknown> = {}
  const terms = normalize(q ?? "").split(" ").filter((t) => t.length > 1).slice(0, 5)
  if (terms.length) {
    filters.$and = terms.map((t) => ({ search_text: { $ilike: `%${t.replace(/[%_]/g, "")}%` } }))
  }
  if (city) filters.city = { $ilike: city.replace(/[%_]/g, "") }

  let lockers = await svc.listSamedayLockers(filters, { take: lat != null && lng != null ? 2000 : limit, order: { city: "ASC", name: "ASC" } })
  if (lat != null && lng != null) {
    lockers = lockers
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => ({ ...l, distance_km: haversine(lat, lng, l.lat!, l.lng!) }))
      .sort((a: any, b: any) => a.distance_km - b.distance_km)
      .slice(0, limit)
  }
  res.setHeader("Cache-Control", "public, max-age=300")
  res.json({
    available: true,
    count: lockers.length,
    lockers: lockers.map((l: any) => ({
      id: l.locker_id,
      name: l.name,
      city: l.city,
      county: l.county,
      address: l.address,
      postal_code: l.postal_code,
      lat: l.lat,
      lng: l.lng,
      schedule: l.schedule,
      distance_km: l.distance_km != null ? Math.round(l.distance_km * 10) / 10 : undefined,
    })),
  })
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
