import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CONTENT_MODULE } from "../../../../../modules/content"
import type ContentModuleService from "../../../../../modules/content/service"
import { CONTENT_DEFAULTS, CONTENT_KEYS, ContentKey } from "../../../../../lib/content/defaults"

/**
 * Updates one content group. Only keys that exist in the defaults are kept,
 * and values must match the default's JSON type, so the storefront always
 * receives the shape it expects.
 */
export async function POST(req: AuthenticatedMedusaRequest<Record<string, unknown>>, res: MedusaResponse) {
  const key = req.params.key as ContentKey
  if (!CONTENT_KEYS.includes(key)) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Unknown content key")
  const value = sanitize(CONTENT_DEFAULTS[key] as unknown, req.validatedBody)
  const svc = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  res.json({ value: await svc.setValue(key, value as Record<string, unknown>) })
}

function sanitize(template: unknown, input: unknown): unknown {
  if (Array.isArray(template)) {
    if (!Array.isArray(input)) return template
    const itemTemplate = template[0]
    return input.slice(0, 50).map((v) => (itemTemplate === undefined ? (typeof v === "string" ? v.slice(0, 500) : null) : sanitize(itemTemplate, v)))
  }
  if (template && typeof template === "object") {
    const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(template as Record<string, unknown>).map(([k, t]) => [k, k in src ? sanitize(t, src[k]) : t])
    )
  }
  if (typeof template === "number") return typeof input === "number" && isFinite(input) ? input : Number(input) || template
  if (typeof template === "boolean") return typeof input === "boolean" ? input : template
  return typeof input === "string" ? input.slice(0, 5000) : template
}
