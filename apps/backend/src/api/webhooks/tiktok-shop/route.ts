import crypto from "crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INTEGRATIONS_MODULE } from "../../../modules/integrations"
import type IntegrationsModuleService from "../../../modules/integrations/service"

/**
 * TikTok Shop webhook receiver. The `Authorization` header must equal
 * HMAC-SHA256(app_key + raw_body, app_secret). Product audit results update
 * the corresponding channel sync row.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const integ = await svc.resolveIntegration("tiktok_shop")
  const raw = (req as any).rawBody as Buffer | string | undefined
  const appKey = String(integ.config.app_key ?? "")
  const secret = String(integ.secrets.app_secret ?? "")
  const signature = String(req.headers["authorization"] ?? "")
  const expected = raw && secret ? crypto.createHmac("sha256", secret).update(appKey + raw.toString()).digest("hex") : ""
  if (!expected || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    await svc.log("tiktok_shop", "warn", "Rejected webhook with invalid signature")
    return res.sendStatus(401)
  }
  const body = req.body as any
  const productId = body?.data?.product_id ? String(body.data.product_id) : null
  if (productId) {
    const [row] = await svc.listChannelSyncs({ provider: "tiktok_shop", external_id: productId })
    if (row) {
      const status = String(body?.data?.status ?? "")
      await svc.updateChannelSyncs({
        id: row.id,
        external_data: { ...((row.external_data as Record<string, unknown>) ?? {}), audit_status: status, audit_reason: body?.data?.suspended_reason ?? null },
        ...(status === "FAILED" || status === "SUSPENDED"
          ? { status: "error", last_error: `TikTok audit: ${status}` }
          : {}),
      })
    }
  }
  await svc.log("tiktok_shop", "info", `Webhook type ${body?.type ?? "?"}`, { shop_id: body?.shop_id, product_id: productId })
  res.sendStatus(200)
}
