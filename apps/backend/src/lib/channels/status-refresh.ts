import type { MedusaContainer } from "@medusajs/framework/types"
import { INTEGRATIONS_MODULE } from "../../modules/integrations"
import type IntegrationsModuleService from "../../modules/integrations/service"
import { GoogleMerchantClient } from "../providers/google-merchant"
import { MetaClient } from "../providers/meta"
import { ProviderError } from "../providers/http"
import { asJson } from "../integrations/crypto"

/**
 * Pulls post-processing results back from the providers so the dashboard
 * shows what the channel actually accepted:
 *  - Google Merchant: item-level issues + destination statuses per offer.
 *  - Meta: results of the asynchronous items_batch requests.
 */
export async function refreshChannelStatuses(container: MedusaContainer, limit = 100) {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const logger = container.resolve("logger")
  let checked = 0

  const google = await svc.resolveIntegration("google_merchant")
  if (google.enabled && google.status === "connected") {
    const c = google.config as Record<string, any>
    const client = new GoogleMerchantClient({
      merchant_id: c.merchant_id,
      data_source_id: c.data_source_id,
      service_account_json: google.secrets.service_account_json,
    })
    const rows = await svc.listChannelSyncs({ provider: "google_merchant", status: "synced" }, { take: limit, order: { updated_at: "ASC" } })
    for (const row of rows) {
      const offers = ((row.external_data as any)?.offer_ids as string[]) ?? []
      const issues: any[] = []
      let disapproved = false
      for (const offer of offers) {
        try {
          const p = await client.getProduct(c.content_language, c.feed_label, offer)
          for (const i of p.productStatus?.itemLevelIssues ?? []) {
            issues.push({ severity: i.severity === "DISAPPROVED" ? "error" : "warning", code: i.code, message: `${offer}: ${i.description}${i.detail ? ` – ${i.detail}` : ""}` })
          }
          disapproved ||= (p.productStatus?.destinationStatuses ?? []).some((d) => (d.disapprovedCountries?.length ?? 0) > 0)
        } catch (e) {
          if (e instanceof ProviderError && e.kind === "not_found") continue // still processing
          logger.warn(`[channels] Google status check failed for ${offer}: ${(e as Error).message}`)
        }
      }
      await svc.updateChannelSyncs({
        id: row.id,
        issues: asJson(issues),
        ...(disapproved ? { status: "error" as const, last_error: "Google Merchant Center: produs respins (vezi problemele)." } : {}),
      })
      checked++
    }
  }

  const meta = await svc.resolveIntegration("meta")
  if (meta.enabled && meta.status === "connected" && meta.config.catalog_id) {
    const client = new MetaClient({
      access_token: String(meta.secrets.access_token),
      catalog_id: String(meta.config.catalog_id),
      graph_version: meta.config.graph_version as string,
    })
    const rows = await svc.listChannelSyncs({ provider: "meta", status: "synced" }, { take: limit })
    for (const row of rows) {
      const ext = (row.external_data as any) ?? {}
      const handles: string[] = ext.batch_handles ?? []
      if (!handles.length || ext.batch_checked) continue
      const errors: string[] = []
      let finished = true
      for (const h of handles) {
        try {
          const res = await client.checkBatch(h)
          for (const d of res.data ?? []) {
            if (d.status !== "finished") finished = false
            for (const err of d.errors ?? []) errors.push(err.message)
          }
        } catch (e) {
          finished = false
          logger.warn(`[channels] Meta batch check failed: ${(e as Error).message}`)
        }
      }
      if (!finished) continue
      await svc.updateChannelSyncs({
        id: row.id,
        external_data: { ...ext, batch_checked: true },
        ...(errors.length ? { status: "error" as const, last_error: `Meta catalog: ${errors.slice(0, 3).join("; ")}` } : {}),
      })
      checked++
    }
  }
  return checked
}
