import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowPath } from "@medusajs/icons"
import { Button, Container, Heading, Select, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../../lib/sdk"
import type { ChannelSync, ConnectionStatus } from "../../lib/types"
import { ConnectionBadge, PROVIDER_LABELS, SyncBadge, formatDate } from "../../components/status"

type Summary = Record<
  string,
  {
    name: string
    enabled: boolean
    status: ConnectionStatus
    status_message: string | null
    counts: Record<string, number>
    last_synced_at: string | null
  }
>

const PAGE = 25

const ChannelsPage = () => {
  const qc = useQueryClient()
  const [provider, setProvider] = useState("all")
  const [status, setStatus] = useState("all")
  const [offset, setOffset] = useState(0)

  const summary = useQuery({
    queryKey: ["channel-summary"],
    queryFn: () => api<{ summary: Summary }>("/admin/channels/summary"),
    refetchInterval: 15000,
  })
  const rows = useQuery({
    queryKey: ["channel-syncs", provider, status, offset],
    queryFn: () =>
      api<{ syncs: ChannelSync[]; count: number }>("/admin/channels/sync", {
        query: {
          ...(provider !== "all" ? { provider } : {}),
          ...(status !== "all" ? { status } : {}),
          limit: PAGE,
          offset,
        },
      }),
    refetchInterval: 15000,
  })

  const trigger = useMutation({
    mutationFn: (body: Record<string, unknown>) => api<{ queued: number }>("/admin/channels/sync", { method: "POST", body }),
    onSuccess: (res) => {
      toast.success(`${res.queued} product(s) queued`)
      qc.invalidateQueries({ queryKey: ["channel-syncs"] })
      qc.invalidateQueries({ queryKey: ["channel-summary"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Channel sync</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Product synchronization with Google Merchant Center, Meta catalog and TikTok Shop. Each channel runs
            independently; failures are retried automatically with back-off.
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="small" isLoading={trigger.isPending} onClick={() => trigger.mutate({ scope: "failed" })}>
            Retry failed
          </Button>
          <Button size="small" isLoading={trigger.isPending} onClick={() => trigger.mutate({ scope: "all" })}>
            Resync catalog
          </Button>
        </div>
      </Container>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Object.entries(summary.data?.summary ?? {}).map(([key, s]) => (
          <Container key={key} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <Text weight="plus">{s.name}</Text>
              <ConnectionBadge status={s.status} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["synced", "pending", "error"] as const).map((k) => (
                <div key={k}>
                  <Text size="xlarge" weight="plus">{s.counts[k] ?? 0}</Text>
                  <Text size="xsmall" className="text-ui-fg-muted capitalize">{k}</Text>
                </div>
              ))}
            </div>
            <Text size="xsmall" className="text-ui-fg-muted mt-2">
              {s.enabled ? `Last sync: ${formatDate(s.last_synced_at)}` : "Disabled – enable in Integrations"}
            </Text>
            {s.status !== "connected" && s.status_message && (
              <Text size="xsmall" className="text-ui-fg-error mt-1">{s.status_message}</Text>
            )}
          </Container>
        ))}
      </div>

      <Container className="divide-y p-0">
        <div className="flex flex-wrap items-center gap-2 px-6 py-4">
          <Select value={provider} onValueChange={(v) => { setProvider(v); setOffset(0) }}>
            <Select.Trigger className="w-48"><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All channels</Select.Item>
              <Select.Item value="google_merchant">Google Merchant</Select.Item>
              <Select.Item value="meta">Meta</Select.Item>
              <Select.Item value="tiktok_shop">TikTok Shop</Select.Item>
            </Select.Content>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setOffset(0) }}>
            <Select.Trigger className="w-40"><Select.Value /></Select.Trigger>
            <Select.Content>
              {["all", "synced", "pending", "processing", "error", "skipped", "removed"].map((s) => (
                <Select.Item key={s} value={s}>{s === "all" ? "All statuses" : s}</Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Product</Table.HeaderCell>
              <Table.HeaderCell>Channel</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Details</Table.HeaderCell>
              <Table.HeaderCell>Last sync</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(rows.data?.syncs ?? []).map((r) => (
              <Table.Row key={r.id}>
                <Table.Cell>
                  {r.product ? <Link to={`/products/${r.product.id}`} className="text-ui-fg-interactive">{r.product.title}</Link> : r.product_id}
                </Table.Cell>
                <Table.Cell>{PROVIDER_LABELS[r.provider] ?? r.provider}</Table.Cell>
                <Table.Cell><SyncBadge status={r.status} /></Table.Cell>
                <Table.Cell className="max-w-md">
                  <Text size="xsmall" className={r.status === "error" ? "text-ui-fg-error" : "text-ui-fg-subtle"}>
                    {r.last_error ??
                      (r.issues?.length ? r.issues.map((i) => i.message).join(" ") : r.external_id ? `ID: ${r.external_id}` : "—")}
                  </Text>
                  {r.next_attempt_at && r.status === "error" && (
                    <Text size="xsmall" className="text-ui-fg-muted">Next retry {formatDate(r.next_attempt_at)} (attempt {r.attempts})</Text>
                  )}
                </Table.Cell>
                <Table.Cell>{formatDate(r.last_synced_at)}</Table.Cell>
                <Table.Cell>
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() => trigger.mutate({ scope: "products", product_ids: [r.product_id], providers: [r.provider] })}
                  >
                    Sync now
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {!rows.data?.syncs?.length && (
          <div className="px-6 py-8 text-center">
            <Text className="text-ui-fg-subtle">No synchronization records yet. Enable a channel in Integrations, then publish or update a product.</Text>
          </div>
        )}
        <Table.Pagination
          count={rows.data?.count ?? 0}
          pageSize={PAGE}
          pageIndex={offset / PAGE}
          pageCount={Math.max(1, Math.ceil((rows.data?.count ?? 0) / PAGE))}
          canPreviousPage={offset > 0}
          canNextPage={offset + PAGE < (rows.data?.count ?? 0)}
          previousPage={() => setOffset((o) => Math.max(0, o - PAGE))}
          nextPage={() => setOffset((o) => o + PAGE)}
        />
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Channel sync",
  icon: ArrowPath,
  rank: 4,
})

export default ChannelsPage
