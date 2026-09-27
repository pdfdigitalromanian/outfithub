import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { INTEGRATIONS_MODULE } from "../../../../modules/integrations"
import type IntegrationsModuleService from "../../../../modules/integrations/service"
import { enqueueProductSync, processDueSyncs, processProductNow } from "../../../../lib/channels/sync-engine"
import { CHANNEL_PROVIDERS } from "../../../../lib/integrations/registry"
import type { PostChannelSyncBody } from "../../../validators"

/** Lists per-product channel sync rows, enriched with product titles. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const filters: Record<string, unknown> = {}
  if (req.query.provider) filters.provider = String(req.query.provider)
  if (req.query.status) filters.status = String(req.query.status)
  if (req.query.product_id) filters.product_id = String(req.query.product_id)
  const limit = Math.min(Number(req.query.limit ?? 50), 200)
  const offset = Number(req.query.offset ?? 0)
  const [rows, count] = await svc.listAndCountChannelSyncs(filters, {
    take: limit,
    skip: offset,
    order: { updated_at: "DESC" },
  })
  const products = rows.length
    ? await productModule.listProducts({ id: [...new Set(rows.map((r) => r.product_id))] }, { select: ["id", "title", "handle", "thumbnail"], withDeleted: true })
    : []
  const byId = new Map(products.map((p) => [p.id, p]))
  res.json({
    syncs: rows.map((r) => ({ ...r, product: byId.get(r.product_id) ?? null })),
    count,
    limit,
    offset,
  })
}

/**
 * Triggers synchronization: specific products, everything that failed, or
 * the full published catalog. Work runs immediately for small batches and is
 * otherwise picked up by the `process-channel-syncs` job.
 */
export async function POST(req: AuthenticatedMedusaRequest<PostChannelSyncBody>, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const { scope, product_ids, providers } = req.validatedBody
  const targets = providers ?? [...CHANNEL_PROVIDERS]
  let ids: string[] = []

  if (scope === "failed") {
    const failed = await svc.listChannelSyncs({ status: "error", provider: targets }, { take: 5000 })
    ids = [...new Set(failed.map((r) => r.product_id))]
  } else if (scope === "all") {
    const products = await productModule.listProducts({ status: "published" }, { select: ["id"], take: 10000 })
    ids = products.map((p) => p.id)
  } else {
    ids = product_ids ?? []
  }

  for (const id of ids) await enqueueProductSync(req.scope, id, "upsert", targets)
  if (ids.length <= 10) {
    for (const id of ids) await processProductNow(req.scope, id)
  } else {
    void processDueSyncs(req.scope, 50)
  }
  res.json({ queued: ids.length, providers: targets })
}
