import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, StatusBadge, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../lib/sdk"
import { formatDate } from "../components/status"

type Shipment = {
  id: string
  fulfillment_id: string | null
  awb_number: string | null
  awb_cost: number | null
  locker_id: string | null
  status: string
  status_label: string | null
  last_error: string | null
  history: Array<{ statusLabel: string; statusDate: string; county?: string }> | null
  created_at: string
}

const COLORS: Record<string, "green" | "red" | "orange" | "grey" | "blue"> = {
  created: "blue",
  in_transit: "blue",
  delivered: "green",
  canceled: "grey",
  returned: "orange",
  error: "red",
  pending: "orange",
}

const OrderSamedayWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const qc = useQueryClient()
  const key = ["sameday-shipments", order.id]
  const { data } = useQuery({ queryKey: key, queryFn: () => api<{ shipments: Shipment[] }>("/admin/sameday/shipments", { query: { order_id: order.id } }) })
  const shippingData = ((order.shipping_methods?.[0] as any)?.data ?? {}) as Record<string, any>
  const samedayFulfillments = (order.fulfillments ?? []).filter((f: any) => String(f.provider_id ?? "").startsWith("sameday") && !f.canceled_at)
  const shipments = data?.shipments ?? []
  const withoutAwb = samedayFulfillments.filter(
    (f: any) => !shipments.some((s) => s.fulfillment_id === f.id && ["created", "in_transit", "delivered"].includes(s.status))
  )

  const onDone = (msg: string) => () => {
    toast.success(msg)
    qc.invalidateQueries({ queryKey: key })
  }
  const onErr = (e: Error) => toast.error(e.message)
  const create = useMutation({
    mutationFn: (fulfillment_id: string) => api("/admin/sameday/shipments", { method: "POST", body: { order_id: order.id, fulfillment_id } }),
    onSuccess: onDone("AWB generated"),
    onError: onErr,
  })
  const refresh = useMutation({ mutationFn: (id: string) => api(`/admin/sameday/shipments/${id}/refresh`, { method: "POST" }), onSuccess: onDone("Tracking updated"), onError: onErr })
  const cancel = useMutation({ mutationFn: (id: string) => api(`/admin/sameday/shipments/${id}/cancel`, { method: "POST" }), onSuccess: onDone("AWB canceled"), onError: onErr })

  const isSameday = !!shippingData.type || samedayFulfillments.length > 0 || shipments.length > 0
  if (!isSameday) return null

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Sameday</Heading>
        {shippingData.type === "easybox" ? (
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Easybox #{shippingData.locker_id} · {shippingData.locker_name}
            {shippingData.locker_address ? `, ${shippingData.locker_address}` : ""}
          </Text>
        ) : (
          <Text size="small" className="text-ui-fg-subtle mt-1">Livrare la adresă</Text>
        )}
      </div>
      {shipments.map((s) => (
        <div key={s.id} className="flex flex-col gap-y-2 px-6 py-3">
          <div className="flex items-center justify-between">
            <Text size="small" weight="plus">{s.awb_number ? `AWB ${s.awb_number}` : "AWB not generated"}</Text>
            <StatusBadge color={COLORS[s.status] ?? "grey"}>{s.status_label ?? s.status}</StatusBadge>
          </div>
          {s.last_error && <Text size="xsmall" className="text-ui-fg-error">{s.last_error}</Text>}
          {s.history?.slice(0, 4).map((h, i) => (
            <Text key={i} size="xsmall" className="text-ui-fg-subtle">{formatDate(h.statusDate)} · {h.statusLabel}</Text>
          ))}
          {s.awb_number && s.status !== "canceled" && (
            <div className="flex flex-wrap gap-2">
              <Button size="small" variant="secondary" asChild>
                <a href={`/admin/sameday/shipments/${s.id}/label`} target="_blank" rel="noreferrer">Label PDF</a>
              </Button>
              <Button size="small" variant="secondary" isLoading={refresh.isPending} onClick={() => refresh.mutate(s.id)}>Refresh tracking</Button>
              <Button size="small" variant="transparent" isLoading={cancel.isPending} onClick={() => cancel.mutate(s.id)}>Cancel AWB</Button>
            </div>
          )}
        </div>
      ))}
      {withoutAwb.map((f: any) => (
        <div key={f.id} className="flex items-center justify-between px-6 py-3">
          <Text size="small">Fulfillment {String(f.id).slice(-6)} · created {formatDate(f.created_at)}</Text>
          <Button size="small" isLoading={create.isPending} onClick={() => create.mutate(f.id)}>Generate AWB</Button>
        </div>
      ))}
      {!samedayFulfillments.length && !shipments.length && (
        <div className="px-6 py-3">
          <Text size="xsmall" className="text-ui-fg-muted">Create a fulfillment to generate the Sameday AWB.</Text>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.side.after" })

export default OrderSamedayWidget
