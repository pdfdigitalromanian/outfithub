import { redactSecrets } from "../integrations/redact"
import crypto from "crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { INTEGRATIONS_MODULE } from "../../modules/integrations"
import type IntegrationsModuleService from "../../modules/integrations/service"
import { CHANNEL_PROVIDERS, ChannelProvider } from "../integrations/registry"
import { ProviderError } from "../providers/http"
import { GoogleMerchantClient } from "../providers/google-merchant"
import { MetaClient } from "../providers/meta"
import { TikTokShopClient } from "../providers/tiktok-shop"
import { loadChannelProduct, ChannelProduct } from "./product-loader"
import { hasBlockingIssues, validateChannelProduct } from "./validate"
import { offerIdFor, toGoogleProductInputs, toMetaItems, toTikTokShopProduct } from "./mappers"
import { getTikTokShopClient } from "./tiktok-shop-auth"
import { asJson } from "../integrations/crypto"

const MAX_ATTEMPTS = 8

export function backoffDelayMs(attempts: number) {
  // 1m, 2m, 4m, … capped at 6h
  return Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 6 * 3600_000)
}

function integrations(container: MedusaContainer) {
  return container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
}

/**
 * Marks a product as needing synchronization on every enabled channel. Each
 * channel gets its own row, so one failing provider never blocks another one
 * nor the product being published in the store.
 */
export async function enqueueProductSync(
  container: MedusaContainer,
  productId: string,
  action: "upsert" | "delete" = "upsert",
  providers: readonly ChannelProvider[] = CHANNEL_PROVIDERS
) {
  const svc = integrations(container)
  const enqueued: ChannelProvider[] = []
  for (const provider of providers) {
    const integ = await svc.resolveIntegration(provider)
    if (!integ.enabled) continue
    const [row] = await svc.listChannelSyncs({ provider, product_id: productId })
    const data = { action, status: "pending" as const, next_attempt_at: new Date(), attempts: 0, last_error: null }
    if (row) {
      if (action === "delete" && !row.external_id && row.status !== "synced") {
        await svc.updateChannelSyncs({ id: row.id, status: "removed", action, next_attempt_at: null })
        continue
      }
      await svc.updateChannelSyncs({ id: row.id, ...data })
    } else if (action === "upsert") {
      await svc.createChannelSyncs({ provider, product_id: productId, ...data })
    } else {
      continue
    }
    enqueued.push(provider)
  }
  return enqueued
}

/** Processes due rows (pending or failed with an elapsed back-off). */
export async function processDueSyncs(container: MedusaContainer, limit = 50) {
  const svc = integrations(container)
  const now = new Date()
  const rows = await svc.listChannelSyncs(
    { status: ["pending", "error"], next_attempt_at: { $lte: now } },
    { take: limit, order: { next_attempt_at: "ASC" } }
  )
  const results: Array<{ id: string; status: string; error?: string }> = []
  for (const row of rows) {
    results.push(await processSyncRow(container, row.id))
  }
  return results
}

export async function processProductNow(container: MedusaContainer, productId: string) {
  const svc = integrations(container)
  const rows = await svc.listChannelSyncs({ product_id: productId, status: ["pending", "error"] })
  // Providers run independently and concurrently.
  return Promise.allSettled(rows.map((r) => processSyncRow(container, r.id)))
}

export async function processSyncRow(container: MedusaContainer, rowId: string) {
  const svc = integrations(container)
  const logger = container.resolve("logger")
  const row = await svc.retrieveChannelSync(rowId)
  const provider = row.provider as ChannelProvider
  await svc.updateChannelSyncs({ id: row.id, status: "processing" })

  try {
    const integ = await svc.resolveIntegration(provider)
    if (!integ.enabled) {
      await svc.updateChannelSyncs({ id: row.id, status: "skipped", last_error: "Integration disabled", next_attempt_at: null })
      return { id: row.id, status: "skipped" }
    }
    const product = row.action === "delete" ? null : await loadChannelProduct(container, row.product_id, {
      brand: (integ.config.default_brand as string) || undefined,
    })
    const shouldDelete = row.action === "delete" || !product || !product.published_in_store

    if (shouldDelete) {
      const deletion = await deleteFromProvider(container, provider, row, integ)
      const removalStatus = deletion?.batch_handles?.length ? "processing" as const : "removed" as const
      await svc.updateChannelSyncs({
        id: row.id,
        status: removalStatus,
        action: "delete",
        ...(deletion ? { external_data: deletion } : {}),
        last_error: null,
        issues: null,
        last_synced_at: new Date(),
        next_attempt_at: null,
      })
      await svc.log(provider, "info", `${removalStatus === "removed" ? "Removed" : "Removal submitted for"} product ${row.product_id}`)
      return { id: row.id, status: removalStatus }
    }

    const issues = validateChannelProduct(product!, provider)
    if (hasBlockingIssues(issues)) {
      await svc.updateChannelSyncs({
        id: row.id,
        status: "error",
        issues: asJson(issues),
        last_error: issues.filter((i) => i.severity === "error").map((i) => i.message).join(" "),
        next_attempt_at: null, // needs a product fix; re-queued on next product update
      })
      return { id: row.id, status: "error" }
    }

    const hash = crypto.createHash("sha256").update(JSON.stringify(product)).digest("hex")
    const result = await upsertToProvider(container, provider, product!, row, integ)
    const syncStatus = provider === "meta" ? "processing" as const : "synced" as const
    await svc.updateChannelSyncs({
      id: row.id,
      status: syncStatus,
      external_id: result.external_id,
      external_data: result.external_data ?? null,
      payload_hash: hash,
      issues: asJson(issues),
      last_error: null,
      attempts: 0,
      last_synced_at: new Date(),
      next_attempt_at: null,
    })
    return { id: row.id, status: syncStatus }
  } catch (e) {
    const err = e instanceof ProviderError ? e : new ProviderError(provider, "server", (e as Error).message)
    const stored = await svc.resolveIntegration(provider).catch(() => null)
    err.message = redactSecrets(err.message, stored?.secrets ?? {})
    const attempts = (row.attempts ?? 0) + 1
    const retry = err.retryable && attempts < MAX_ATTEMPTS
    await svc.updateChannelSyncs({
      id: row.id,
      status: err.kind === "not_configured" ? "skipped" : "error",
      attempts,
      last_error: err.message.slice(0, 2000),
      next_attempt_at: retry ? new Date(Date.now() + backoffDelayMs(attempts)) : null,
    })
    if (err.kind === "authentication" || err.kind === "authorization" || err.kind === "not_configured") {
      await svc.setStatus(provider, err.connectionStatus, err.message)
    }
    await svc.log(provider, "error", `Sync failed for ${row.product_id}: ${err.message}`, {
      kind: err.kind,
      status: err.status,
      attempts,
    })
    logger.warn(`[channels] ${provider} sync failed for ${row.product_id}: ${err.message}`)
    return { id: row.id, status: "error", error: err.message }
  }
}

type ResolvedInteg = Awaited<ReturnType<IntegrationsModuleService["resolveIntegration"]>>
type SyncRow = { id: string; product_id: string; external_id?: string | null; external_data?: unknown }

async function upsertToProvider(
  container: MedusaContainer,
  provider: ChannelProvider,
  product: ChannelProduct,
  row: SyncRow,
  integ: ResolvedInteg
): Promise<{ external_id: string; external_data?: Record<string, unknown> }> {
  const c = integ.config as Record<string, any>
  const s = integ.secrets as Record<string, any>

  if (provider === "google_merchant") {
    const client = new GoogleMerchantClient({
      merchant_id: c.merchant_id,
      data_source_id: c.data_source_id,
      service_account_json: s.service_account_json,
    })
    const inputs = toGoogleProductInputs(product, c as any)
    const previous = ((row.external_data as any)?.offer_ids as string[] | undefined) ?? []
    const current = inputs.map((i) => i.offerId)
    for (const input of inputs) await client.insertProductInput(input)
    // Variants removed since the last sync are deleted from Merchant Center.
    for (const stale of previous.filter((o) => !current.includes(o))) {
      await client.deleteProductInput(c.content_language, c.feed_label, stale).catch((error: unknown) => {
        if (!(error instanceof ProviderError) || error.kind !== "not_found") throw error
      })
    }
    return { external_id: product.id, external_data: { offer_ids: current } }
  }

  if (provider === "meta") {
    const client = new MetaClient({ access_token: s.access_token, catalog_id: c.catalog_id, graph_version: c.graph_version })
    const items = toMetaItems(product, c.default_brand)
    const previous = ((row.external_data as any)?.retailer_ids as string[] | undefined) ?? []
    const current = items.map((i) => i.id)
    const requests = [
      ...items.map((data) => ({ method: "UPDATE" as const, data })),
      ...previous.filter((id) => !current.includes(id)).map((id) => ({ method: "DELETE" as const, data: { id } })),
    ]
    const res = await client.itemsBatch(requests)
    return { external_id: product.id, external_data: { retailer_ids: current, batch_handles: res.handles } }
  }

  // TikTok Shop
  const client = await getTikTokShopClient(container)
  if (!c.category_id) {
    throw new ProviderError("tiktok_shop", "not_configured", "Default TikTok category ID is required to list products")
  }
  if (!c.warehouse_id) {
    throw new ProviderError("tiktok_shop", "not_configured", "Warehouse ID is missing (authorize the shop first)")
  }
  const ext = (row.external_data as any) ?? {}
  let imageUris: string[] = ext.image_uris ?? []
  const imageKey = product.images.join("|")
  if (!imageUris.length || ext.image_key !== imageKey) {
    imageUris = []
    for (const [i, url] of product.images.slice(0, 9).entries()) {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
      if (!res.ok) throw new ProviderError("tiktok_shop", "bad_request", `Could not download image ${url}`)
      const up = await client.uploadImage(Buffer.from(await res.arrayBuffer()), `${product.handle}-${i}.jpg`)
      imageUris.push(up.uri)
    }
  }
  const body = toTikTokShopProduct(product, c as any, imageUris)
  const out = row.external_id
    ? await client.editProduct(row.external_id, body)
    : await client.createProduct(body)
  return {
    external_id: out.product_id,
    external_data: {
      image_uris: imageUris,
      image_key: imageKey,
      skus: Object.fromEntries(out.skus.map((sk) => [sk.seller_sku, sk.id])),
    },
  }
}

async function deleteFromProvider(
  container: MedusaContainer,
  provider: ChannelProvider,
  row: SyncRow,
  integ: ResolvedInteg
) {
  const c = integ.config as Record<string, any>
  const s = integ.secrets as Record<string, any>
  const ext = (row.external_data as any) ?? {}
  if (provider === "google_merchant") {
    const client = new GoogleMerchantClient({
      merchant_id: c.merchant_id,
      data_source_id: c.data_source_id,
      service_account_json: s.service_account_json,
    })
    for (const offerId of (ext.offer_ids as string[]) ?? []) {
      await client.deleteProductInput(c.content_language, c.feed_label, offerId).catch((e: ProviderError) => {
        if (e.kind !== "not_found") throw e
      })
    }
    return
  }
  if (provider === "meta") {
    const ids = (ext.retailer_ids as string[]) ?? []
    if (!ids.length) return
    const client = new MetaClient({ access_token: s.access_token, catalog_id: c.catalog_id, graph_version: c.graph_version })
    const result = await client.itemsBatch(ids.map((id) => ({ method: "DELETE" as const, data: { id } })))
    return { retailer_ids: ids, batch_handles: result.handles, batch_checked: false }
  }
  if (row.external_id) {
    const client = await getTikTokShopClient(container)
    await client.deleteProducts([row.external_id])
  }
}

/**
 * Lightweight stock/price refresh used after inventory changes: Merchant API and
 * Meta upserts are idempotent so a full upsert is used; TikTok Shop has
 * dedicated inventory/price endpoints.
 */
export async function pushTikTokInventoryAndPrice(container: MedusaContainer, productId: string) {
  const svc = integrations(container)
  const [row] = await svc.listChannelSyncs({ provider: "tiktok_shop", product_id: productId, status: "synced" })
  if (!row?.external_id) return
  const integ = await svc.resolveIntegration("tiktok_shop")
  const product = await loadChannelProduct(container, productId)
  if (!product) return
  const skuMap = ((row.external_data as any)?.skus ?? {}) as Record<string, string>
  const client = await getTikTokShopClient(container)
  const skus = product.variants.filter((v) => skuMap[offerIdFor(v)])
  await client.updateInventory(
    row.external_id,
    skus.map((v) => ({
      id: skuMap[offerIdFor(v)],
      inventory: [{ warehouse_id: String(integ.config.warehouse_id), quantity: Math.max(0, v.quantity ?? 999) }],
    }))
  )
  await client.updatePrices(
    row.external_id,
    skus.map((v) => ({ id: skuMap[offerIdFor(v)], price: { amount: (v.price ?? 0).toFixed(2), currency: v.currency_code } }))
  )
}

export { TikTokShopClient }
