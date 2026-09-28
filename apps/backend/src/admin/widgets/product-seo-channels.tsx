import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../lib/sdk"
import type { ChannelSync } from "../lib/types"
import { SeoPanel } from "../components/seo-panel"
import { PROVIDER_LABELS, SyncBadge, formatDate } from "../components/status"

const ProductSeoChannelsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const qc = useQueryClient()
  const syncs = useQuery({
    queryKey: ["product-channel-syncs", data.id],
    queryFn: () => api<{ syncs: ChannelSync[] }>("/admin/channels/sync", { query: { product_id: data.id } }),
    refetchInterval: 10000,
  })
  const trigger = useMutation({
    mutationFn: () => api("/admin/channels/sync", { method: "POST", body: { scope: "products", product_ids: [data.id] } }),
    onSuccess: () => {
      toast.success("Sincronizarea a început")
      qc.invalidateQueries({ queryKey: ["product-channel-syncs", data.id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="oh-admin flex flex-col gap-y-3">
      <SeoPanel type="product" id={data.id} storefrontPath={`/products/${data.handle}`} />
      <Container className="oh-admin divide-y p-0">
        <div className="flex flex-wrap items-center justify-between gap-y-3 px-6 py-4">
          <Heading level="h2">Canale de vânzare</Heading>
          <Button size="small" variant="secondary" isLoading={trigger.isPending} onClick={() => trigger.mutate()}>
            Sincronizează acum
          </Button>
        </div>
        {(syncs.data?.syncs ?? []).map((s) => (
          <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 px-6 py-3">
            <div className="min-w-0">
              <Text size="small" weight="plus">{PROVIDER_LABELS[s.provider] ?? s.provider}</Text>
              <Text size="xsmall" className={s.status === "error" ? "text-ui-fg-error" : "text-ui-fg-subtle"}>
                {s.last_error ?? (s.last_synced_at ? `Ultima sincronizare: ${formatDate(s.last_synced_at)}` : "În așteptare")}
              </Text>
              {s.issues?.filter((i) => i.severity === "warning").map((i) => (
                <Text key={i.code} size="xsmall" className="text-ui-fg-muted">⚠ {i.message}</Text>
              ))}
            </div>
            <SyncBadge status={s.status} />
          </div>
        ))}
        {!syncs.data?.syncs?.length && (
          <div className="px-6 py-4">
            <Text size="small" className="text-ui-fg-subtle">
              Niciun canal extern activat. Configurează Google Merchant, Meta sau TikTok Shop în Integrări.
            </Text>
          </div>
        )}
      </Container>
    </div>
  )
}

export const config = defineWidgetConfig({ zone: "product.details.side.after" })

export default ProductSeoChannelsWidget
