import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Bolt } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { api } from "../../lib/sdk"
import type { Integration, IntegrationField } from "../../lib/types"
import { ConnectionBadge, formatDate } from "../../components/status"

const CATEGORY_LABELS: Record<string, string> = {
  sales_channel: "Sales channels",
  tracking: "Tracking & pixels",
  analytics: "Analytics",
  shipping: "Shipping",
}

const IntegrationsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api<{ integrations: Integration[] }>("/admin/integrations"),
  })
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tiktok = params.get("tiktok")
    if (tiktok === "connected") toast.success("TikTok Shop authorized")
    else if (tiktok) toast.error(`TikTok Shop authorization failed (${tiktok})`)
  }, [])

  const grouped = useMemo(() => {
    const out: Record<string, Integration[]> = {}
    for (const i of data?.integrations ?? []) (out[i.category] ??= []).push(i)
    return out
  }, [data])

  const current = data?.integrations.find((i) => i.provider === open) ?? null

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="px-6 py-4">
        <Heading level="h1">Integrations</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Connect sales channels, tracking and shipping. Credentials are encrypted at rest (AES-256-GCM) and never
          sent back to the browser. Every connection is verified against the provider when saved.
        </Text>
      </Container>
      {isLoading && <Container className="px-6 py-4"><Text>Loading…</Text></Container>}
      {Object.entries(grouped).map(([category, list]) => (
        <Container key={category} className="divide-y p-0">
          <div className="px-6 py-4">
            <Heading level="h2">{CATEGORY_LABELS[category] ?? category}</Heading>
          </div>
          {list.map((i) => (
            <div key={i.provider} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Text weight="plus">{i.name}</Text>
                  <ConnectionBadge status={i.status} />
                  {!i.enabled && i.status !== "not_configured" && (
                    <Text size="xsmall" className="text-ui-fg-muted">disabled</Text>
                  )}
                </div>
                <Text size="small" className="text-ui-fg-subtle mt-1 max-w-3xl">{i.description}</Text>
                {i.status_message && (
                  <Text size="xsmall" className={i.status === "connected" ? "text-ui-fg-subtle mt-1" : "text-ui-fg-error mt-1"}>
                    {i.status_message}
                  </Text>
                )}
              </div>
              <Button variant="secondary" size="small" onClick={() => setOpen(i.provider)}>
                Configure
              </Button>
            </div>
          ))}
        </Container>
      ))}
      {current && <IntegrationDrawer integration={current} onClose={() => setOpen(null)} />}
    </div>
  )
}

const IntegrationDrawer = ({ integration, onClose }: { integration: Integration; onClose: () => void }) => {
  const qc = useQueryClient()
  const [enabled, setEnabled] = useState(integration.enabled)
  const [config, setConfig] = useState<Record<string, any>>(integration.config ?? {})
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [details, setDetails] = useState<Record<string, unknown> | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ["integrations"] })

  const save = useMutation({
    mutationFn: () => api(`/admin/integrations/${integration.provider}`, { method: "POST", body: { enabled, config, secrets } }),
    onSuccess: (res: any) => {
      setSecrets({})
      setDetails(res.test?.details ?? null)
      const status = res.test?.status
      if (status === "connected") toast.success(`${integration.name}: connected`)
      else toast.warning(`${integration.name}: ${res.test?.message ?? status}`)
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const test = useMutation({
    mutationFn: () => api(`/admin/integrations/${integration.provider}/test`, { method: "POST" }),
    onSuccess: (res: any) => {
      setDetails(res.test?.details ?? null)
      res.test?.status === "connected" ? toast.success(res.test.message) : toast.warning(res.test?.message)
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const action = useMutation({
    mutationFn: async (kind: "tiktok_authorize" | "google_datasource" | "sameday_lockers") => {
      if (kind === "tiktok_authorize") {
        const res = await api<{ url: string }>("/admin/integrations/tiktok_shop/authorize")
        window.location.href = res.url
        return null
      }
      if (kind === "google_datasource") return api("/admin/integrations/google_merchant/data-source", { method: "POST" })
      return api("/admin/sameday/lockers/sync", { method: "POST" })
    },
    onSuccess: (res: any) => {
      if (res?.data_source) toast.success(`Data source ${res.data_source.dataSourceId} created`)
      if (res?.result) toast.success(`Easybox list refreshed: ${res.result.total} lockers`)
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const logs = useQuery({
    queryKey: ["integration-logs", integration.provider],
    queryFn: () => api<{ logs: any[] }>(`/admin/integrations/${integration.provider}/logs`),
  })

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content className="max-w-xl">
        <Drawer.Header>
          <Drawer.Title>{integration.name}</Drawer.Title>
          <Drawer.Description>
            <a className="text-ui-fg-interactive" href={integration.docs_url} target="_blank" rel="noreferrer">
              Provider documentation ↗
            </a>
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ConnectionBadge status={integration.status} />
              <Text size="xsmall" className="text-ui-fg-muted">Checked {formatDate(integration.last_checked_at)}</Text>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="enabled">Enabled</Label>
              <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>
          {integration.status_message && (
            <Text size="small" className="text-ui-fg-subtle">{integration.status_message}</Text>
          )}
          {integration.fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={f.secret ? secrets[f.key] ?? "" : config[f.key] ?? ""}
              stored={f.secret ? integration.secrets[f.key] : null}
              onChange={(v) =>
                f.secret ? setSecrets((s) => ({ ...s, [f.key]: v as string })) : setConfig((c) => ({ ...c, [f.key]: v }))
              }
            />
          ))}
          {integration.provider === "tiktok_shop" && (
            <Text size="xsmall" className="text-ui-fg-subtle">
              Redirect URL to register in TikTok Partner Center: <code>{window.location.origin}/integrations/tiktok-shop/callback</code>.
              Webhook URL: <code>{window.location.origin}/webhooks/tiktok-shop</code>
            </Text>
          )}
          {integration.provider === "meta" && (
            <Text size="xsmall" className="text-ui-fg-subtle">
              Webhook callback URL: <code>{window.location.origin}/webhooks/meta</code> (uses the verify token and app secret above).
            </Text>
          )}
          {details && (
            <div className="bg-ui-bg-subtle rounded-md p-3">
              <Text size="xsmall" weight="plus">Details from provider</Text>
              <pre className="mt-2 max-h-64 overflow-auto text-xs">{JSON.stringify(details, null, 2)}</pre>
            </div>
          )}
          <div>
            <Text size="small" weight="plus" className="mb-2">Recent activity</Text>
            <div className="flex flex-col gap-y-1">
              {(logs.data?.logs ?? []).slice(0, 15).map((l) => (
                <Text key={l.id} size="xsmall" className={l.level === "error" ? "text-ui-fg-error" : "text-ui-fg-subtle"}>
                  {formatDate(l.created_at)} · {l.message}
                </Text>
              ))}
              {!logs.data?.logs?.length && <Text size="xsmall" className="text-ui-fg-muted">No activity yet.</Text>}
            </div>
          </div>
        </Drawer.Body>
        <Drawer.Footer className="flex flex-wrap gap-2">
          {integration.provider === "tiktok_shop" && (
            <Button variant="secondary" isLoading={action.isPending} onClick={() => action.mutate("tiktok_authorize")}>
              Authorize seller
            </Button>
          )}
          {integration.provider === "google_merchant" && (
            <Button variant="secondary" isLoading={action.isPending} onClick={() => action.mutate("google_datasource")}>
              Create API data source
            </Button>
          )}
          {integration.provider === "sameday" && (
            <Button variant="secondary" isLoading={action.isPending} onClick={() => action.mutate("sameday_lockers")}>
              Refresh Easybox list
            </Button>
          )}
          <Button variant="secondary" isLoading={test.isPending} onClick={() => test.mutate()}>
            Test connection
          </Button>
          <Button isLoading={save.isPending} onClick={() => save.mutate()}>
            Save & verify
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const FieldInput = ({
  field,
  value,
  stored,
  onChange,
}: {
  field: IntegrationField
  value: any
  stored: string | null
  onChange: (v: unknown) => void
}) => {
  const id = `f-${field.key}`
  const placeholder = field.secret && stored ? `Saved (${stored}) – leave empty to keep` : field.placeholder
  return (
    <div className="flex flex-col gap-y-1">
      <Label htmlFor={id} size="small">
        {field.label}
        {field.required && <span className="text-ui-fg-error"> *</span>}
        {field.public && <span className="text-ui-fg-muted"> · public</span>}
      </Label>
      {field.type === "textarea" ? (
        <Textarea id={id} rows={5} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "select" ? (
        <Select value={String(value || field.default || "")} onValueChange={onChange}>
          <Select.Trigger id={id}><Select.Value /></Select.Trigger>
          <Select.Content>
            {field.options?.map((o) => (
              <Select.Item key={o.value} value={o.value}>{o.label}</Select.Item>
            ))}
          </Select.Content>
        </Select>
      ) : field.type === "boolean" ? (
        <Switch id={id} checked={value === true || value === "true"} onCheckedChange={onChange} />
      ) : (
        <Input
          id={id}
          type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        />
      )}
      {field.help && <Text size="xsmall" className="text-ui-fg-muted">{field.help}</Text>}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Integrations",
  icon: Bolt,
  rank: 3,
})

export default IntegrationsPage
