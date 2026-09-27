import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { INTEGRATIONS_MODULE } from "../../modules/integrations"
import type IntegrationsModuleService from "../../modules/integrations/service"
import { ProviderError } from "../providers/http"
import { asJson } from "../integrations/crypto"
import { SamedayClient, SamedayEnvironment, SamedayToken, mapSamedayStatus } from "../providers/sameday"

const EASYBOX_OPTION = "sameday-easybox"

export async function getSamedayClient(container: MedusaContainer) {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const integ = await svc.resolveIntegration("sameday")
  const s = integ.secrets as Record<string, any>
  if (!s.username || !s.password) {
    throw new ProviderError("sameday", "not_configured", "Sameday API credentials are not configured")
  }
  const env = (integ.config.environment as SamedayEnvironment) || "production"
  const cachedToken = s._token && s._token_env === env ? (s._token as SamedayToken) : null
  return new SamedayClient(
    { username: s.username, password: s.password, environment: env },
    {
      token: cachedToken,
      onToken: (t) => svc.storeSecrets("sameday", { _token: t, _token_env: env }),
    }
  )
}

/** Refreshes the local Easybox cache from the Sameday API. */
export async function syncSamedayLockers(container: MedusaContainer) {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const client = await getSamedayClient(container)
  const lockers = await client.getLockers()
  const existing = await svc.listSamedayLockers({}, { take: 100000, select: ["id", "locker_id"] })
  const byLockerId = new Map(existing.map((l) => [l.locker_id, l.id]))
  const seen = new Set<string>()
  const toCreate: any[] = []
  const toUpdate: any[] = []
  for (const l of lockers) {
    const locker_id = String(l.lockerId)
    seen.add(locker_id)
    const data = {
      locker_id,
      name: l.name,
      type: "locker",
      county: l.county ?? null,
      city: l.city ?? null,
      address: l.address ?? null,
      postal_code: l.postalCode ?? null,
      lat: l.lat != null ? Number(l.lat) : null,
      lng: l.lng != null ? Number(l.lng) : null,
      schedule: l.schedule ? asJson(l.schedule) : null,
      search_text: normalize(`${l.name} ${l.city} ${l.county} ${l.address} ${l.postalCode}`),
    }
    const id = byLockerId.get(locker_id)
    if (id) toUpdate.push({ id, ...data })
    else toCreate.push(data)
  }
  for (let i = 0; i < toCreate.length; i += 500) await svc.createSamedayLockers(toCreate.slice(i, i + 500))
  for (let i = 0; i < toUpdate.length; i += 500) await svc.updateSamedayLockers(toUpdate.slice(i, i + 500))
  const stale = existing.filter((l) => !seen.has(l.locker_id)).map((l) => l.id)
  if (stale.length) await svc.deleteSamedayLockers(stale)
  await svc.log("sameday", "info", `Easybox list refreshed: ${lockers.length} lockers`)
  return { total: lockers.length, created: toCreate.length, updated: toUpdate.length, removed: stale.length }
}

export function normalize(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Creates the Sameday AWB for a Medusa fulfillment and attaches tracking
 * information as a fulfillment label. Idempotent per fulfillment.
 */
export async function createAwbForFulfillment(container: MedusaContainer, orderId: string, fulfillmentId: string) {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  const [already] = await svc.listSamedayShipments({ fulfillment_id: fulfillmentId, status: ["created", "in_transit", "delivered"] })
  if (already) return already

  const { data: [order] } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "total",
      "shipping_address.*",
      "shipping_methods.data",
      "shipping_methods.shipping_option_id",
      "payment_collections.payment_sessions.provider_id",
      "payment_collections.status",
      "fulfillments.id",
      "fulfillments.provider_id",
      "fulfillments.items.quantity",
      "fulfillments.data",
    ],
    filters: { id: orderId },
  })
  if (!order) throw new Error(`Order ${orderId} not found`)
  const fulfillment = (order.fulfillments ?? []).find((f: any) => f?.id === fulfillmentId) as any
  if (!fulfillment || !String(fulfillment.provider_id).startsWith("sameday")) {
    return null
  }

  const integ = await svc.resolveIntegration("sameday")
  const c = integ.config as Record<string, any>
  const shippingData = ((order.shipping_methods ?? [])[0] as any)?.data ?? {}
  const isLocker = shippingData.type === "easybox" || !!shippingData.locker_id
  const serviceId = isLocker ? c.service_id_locker : c.service_id_home

  const shipment = await svc.createSamedayShipments({
    order_id: orderId,
    fulfillment_id: fulfillmentId,
    locker_id: isLocker ? String(shippingData.locker_id) : null,
    service_id: serviceId ? Number(serviceId) : null,
    status: "pending",
  })

  try {
    if (!c.pickup_point_id || !serviceId) {
      throw new ProviderError("sameday", "not_configured", "Pickup point / service ID are not configured (run Test connection)")
    }
    const addr = order.shipping_address as any
    const providerIds = (order.payment_collections ?? []).flatMap((pc: any) =>
      (pc?.payment_sessions ?? []).map((ps: any) => ps?.provider_id)
    )
    const isCod = providerIds.some((p: string) => p?.startsWith("pp_system"))
    const weight = Number(c.default_weight_kg) || 1
    const client = await getSamedayClient(container)
    const res = await client.createAwb({
      pickupPoint: c.pickup_point_id,
      contactPerson: c.contact_person_id || undefined,
      service: serviceId,
      packageType: 0,
      cashOnDelivery: isCod ? Number(order.total) : 0,
      insuredValue: 0,
      awbRecipient: {
        name: `${addr?.first_name ?? ""} ${addr?.last_name ?? ""}`.trim(),
        phoneNumber: addr?.phone ?? "",
        email: order.email ?? "",
        address: [addr?.address_1, addr?.address_2].filter(Boolean).join(", "),
        cityString: addr?.city ?? "",
        countyString: addr?.province ?? "",
        postalCode: addr?.postal_code ?? undefined,
        personType: addr?.company ? 1 : 0,
      },
      parcels: [{ weight }],
      clientInternalReference: `order-${order.display_id}`,
      observation: `Comanda #${order.display_id}`,
      lockerLastMile: isLocker ? shippingData.locker_id : undefined,
      currency: String(order.currency_code).toUpperCase(),
    })
    await svc.updateSamedayShipments({
      id: shipment.id,
      awb_number: res.awbNumber,
      awb_cost: Number(res.awbCost) || null,
      parcels: res.parcels ? asJson(res.parcels) : null,
      status: "created",
      last_error: null,
    })
    const backend = (process.env.MEDUSA_BACKEND_URL || "").replace(/\/$/, "")
    await fulfillmentModule.updateFulfillment(fulfillmentId, {
      labels: [
        {
          tracking_number: res.awbNumber,
          tracking_url: `https://sameday.ro/#awb=${encodeURIComponent(res.awbNumber)}`,
          label_url: `${backend}/admin/sameday/shipments/${shipment.id}/label`,
        },
      ],
      data: { ...(fulfillment.data ?? {}), awb_status: "created", awb_number: res.awbNumber },
    } as any)
    await svc.log("sameday", "info", `AWB ${res.awbNumber} created for order #${order.display_id}`)
    return svc.retrieveSamedayShipment(shipment.id)
  } catch (e) {
    const message = (e as Error).message
    await svc.updateSamedayShipments({ id: shipment.id, status: "error", last_error: message.slice(0, 2000) })
    await svc.log("sameday", "error", `AWB creation failed for order ${orderId}: ${message}`)
    throw e
  }
}

export async function cancelShipment(container: MedusaContainer, shipmentId: string) {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const shipment = await svc.retrieveSamedayShipment(shipmentId)
  if (shipment.awb_number && shipment.status !== "canceled") {
    const client = await getSamedayClient(container)
    await client.cancelAwb(shipment.awb_number)
  }
  await svc.updateSamedayShipments({ id: shipment.id, status: "canceled" })
  await svc.log("sameday", "info", `AWB ${shipment.awb_number ?? "(none)"} canceled`)
  return svc.retrieveSamedayShipment(shipment.id)
}

export async function refreshShipmentStatus(container: MedusaContainer, shipmentId: string) {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const shipment = await svc.retrieveSamedayShipment(shipmentId)
  if (!shipment.awb_number) return shipment
  const client = await getSamedayClient(container)
  const res = await client.getAwbStatus(shipment.awb_number)
  const status = res.expeditionSummary?.delivered
    ? "delivered"
    : res.expeditionSummary?.canceled
      ? "canceled"
      : mapSamedayStatus(res.expeditionStatus ?? {})
  await svc.updateSamedayShipments({
    id: shipment.id,
    status,
    status_label: res.expeditionStatus?.statusLabel ?? res.expeditionStatus?.status ?? null,
    history: asJson(res.expeditionHistory ?? []),
  })
  return svc.retrieveSamedayShipment(shipment.id)
}

export { EASYBOX_OPTION }
