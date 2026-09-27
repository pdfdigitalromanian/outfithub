import crypto from "crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INTEGRATIONS_MODULE } from "../../../modules/integrations"
import type IntegrationsModuleService from "../../../modules/integrations/service"
import { verifyMetaSignature } from "../../../lib/providers/meta"

/**
 * Meta webhook endpoint (App Dashboard → Webhooks). GET handles the
 * verification handshake, POST validates X-Hub-Signature-256 with the app
 * secret before accepting catalog/commerce notifications.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const integ = await svc.resolveIntegration("meta")
  const token = String(integ.secrets.webhook_verify_token ?? "")
  const given = String(req.query["hub.verify_token"] ?? "")
  if (
    req.query["hub.mode"] === "subscribe" &&
    token &&
    given.length === token.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token))
  ) {
    return res.status(200).send(String(req.query["hub.challenge"] ?? ""))
  }
  res.sendStatus(403)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const integ = await svc.resolveIntegration("meta")
  const raw = (req as any).rawBody as Buffer | string | undefined
  const ok = raw && verifyMetaSignature(raw, req.headers["x-hub-signature-256"] as string, String(integ.secrets.app_secret ?? ""))
  if (!ok) {
    await svc.log("meta", "warn", "Rejected webhook with invalid signature")
    return res.sendStatus(401)
  }
  const body = req.body as any
  await svc.log("meta", "info", `Webhook received: ${body?.object ?? "unknown"}`, {
    entries: (body?.entry ?? []).slice(0, 20).map((e: any) => ({ id: e.id, changes: (e.changes ?? []).map((c: any) => c.field) })),
  })
  res.sendStatus(200)
}
