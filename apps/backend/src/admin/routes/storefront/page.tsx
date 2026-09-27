import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { api } from "../../lib/sdk"

const GROUPS: Array<{ key: string; label: string; help: string }> = [
  { key: "homepage", label: "Homepage", help: "Hero, editorial block, featured collections (collection handles) and USP strip." },
  { key: "company", label: "Company & legal", help: "Legal entity data. Used in the footer and filled into the legal pages ({{company.*}})." },
  { key: "social", label: "Social links", help: "Full profile URLs. Empty links are hidden." },
  { key: "seo", label: "SEO defaults", help: "Site name, title template (%s = page title) and templates used by automatic product SEO ({title}, {collection}, {excerpt})." },
  { key: "announcement", label: "Announcement bar", help: "Top-of-page message." },
  { key: "shipping", label: "Shipping & returns", help: "Values shown in the cart and the shipping/returns pages. Actual shipping prices are set in Settings → Locations & Shipping." },
]

const humanize = (k: string) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())

const StorefrontPage = () => {
  const { data } = useQuery({
    queryKey: ["storefront-content"],
    queryFn: () => api<{ content: Record<string, any> }>("/admin/content"),
  })
  return (
    <div className="flex flex-col gap-y-3">
      <Container className="px-6 py-4">
        <Heading level="h1">Storefront</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Edit homepage content, company information, social links, SEO defaults and legal pages. Changes are live on the storefront within a minute.
        </Text>
      </Container>
      <Container className="p-0">
        <Tabs defaultValue="homepage">
          <Tabs.List className="px-6 pt-4 flex-wrap">
            {GROUPS.map((g) => (
              <Tabs.Trigger key={g.key} value={g.key}>{g.label}</Tabs.Trigger>
            ))}
            <Tabs.Trigger value="pages">Pages & legal</Tabs.Trigger>
          </Tabs.List>
          {GROUPS.map((g) => (
            <Tabs.Content key={g.key} value={g.key} className="px-6 py-4">
              <Text size="small" className="text-ui-fg-subtle mb-4">{g.help}</Text>
              {data?.content?.[g.key] && <GroupEditor group={g.key} value={data.content[g.key]} />}
            </Tabs.Content>
          ))}
          <Tabs.Content value="pages" className="py-4">
            <PagesEditor />
          </Tabs.Content>
        </Tabs>
      </Container>
    </div>
  )
}

const GroupEditor = ({ group, value }: { group: string; value: Record<string, any> }) => {
  const qc = useQueryClient()
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const save = useMutation({
    mutationFn: () => api(`/admin/content/values/${group}`, { method: "POST", body: draft }),
    onSuccess: () => {
      toast.success("Saved")
      qc.invalidateQueries({ queryKey: ["storefront-content"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <div className="flex flex-col gap-y-4">
      <ValueEditor value={draft} onChange={setDraft} path={group} />
      <div className="flex justify-end">
        <Button isLoading={save.isPending} onClick={() => save.mutate()}>Save</Button>
      </div>
    </div>
  )
}

/** Renders inputs for any JSON value shape (objects, arrays, strings, numbers, booleans). */
const ValueEditor = ({ value, onChange, path }: { value: any; onChange: (v: any) => void; path: string }) => {
  if (Array.isArray(value)) {
    const isStrings = value.every((v) => typeof v === "string")
    if (isStrings) {
      return (
        <Input
          value={value.join(", ")}
          placeholder="comma separated"
          onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      )
    }
    return (
      <div className="flex flex-col gap-y-3">
        {value.map((item, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Text size="xsmall" weight="plus">#{i + 1}</Text>
              <Button size="small" variant="transparent" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</Button>
            </div>
            <ValueEditor value={item} path={`${path}.${i}`} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
          </div>
        ))}
        <div>
          <Button
            size="small"
            variant="secondary"
            onClick={() => onChange([...value, Object.fromEntries(Object.keys(value[0] ?? { title: "", body: "" }).map((k) => [k, ""]))])}
          >
            Add item
          </Button>
        </div>
      </div>
    )
  }
  if (value && typeof value === "object") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Object.entries(value).map(([k, v]) => {
          const id = `${path}.${k}`
          const nested = v && typeof v === "object"
          const long = typeof v === "string" && (v.length > 80 || /body|description|subtitle/.test(k))
          return (
            <div key={k} className={nested || long ? "md:col-span-2 flex flex-col gap-y-1" : "flex flex-col gap-y-1"}>
              <Label htmlFor={id} size="small" weight="plus">{humanize(k)}</Label>
              {typeof v === "boolean" ? (
                <Switch id={id} checked={v} onCheckedChange={(c) => onChange({ ...value, [k]: c })} />
              ) : typeof v === "number" ? (
                <Input id={id} type="number" value={v} onChange={(e) => onChange({ ...value, [k]: Number(e.target.value) })} />
              ) : nested ? (
                <div className="rounded-lg border p-3">
                  <ValueEditor value={v} path={id} onChange={(nv) => onChange({ ...value, [k]: nv })} />
                </div>
              ) : long ? (
                <Textarea id={id} rows={3} value={v as string} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
              ) : (
                <Input id={id} value={(v as string) ?? ""} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
              )}
            </div>
          )
        })}
      </div>
    )
  }
  return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
}

type Page = {
  id?: string
  handle: string
  title: string
  body: string
  seo_title?: string | null
  seo_description?: string | null
  is_legal?: boolean
  published?: boolean
}

const PagesEditor = () => {
  const qc = useQueryClient()
  const prompt = usePrompt()
  const [editing, setEditing] = useState<Page | null>(null)
  const { data } = useQuery({ queryKey: ["content-pages"], queryFn: () => api<{ pages: Page[] }>("/admin/content/pages") })
  const save = useMutation({
    mutationFn: (p: Page) => {
      const { id, ...body } = p
      return api(id ? `/admin/content/pages/${id}` : "/admin/content/pages", {
        method: "POST",
        body: { ...body, seo_title: body.seo_title || null, seo_description: body.seo_description || null },
      })
    },
    onSuccess: () => {
      toast.success("Page saved")
      setEditing(null)
      qc.invalidateQueries({ queryKey: ["content-pages"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/content/pages/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-pages"] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between px-6 pb-4">
        <Text size="small" className="text-ui-fg-subtle">
          Markdown pages served at /pages/&lt;handle&gt;. Tokens such as {"{{company.legal_name}}"} are filled from Company & legal.
          Have legal texts reviewed by a lawyer.
        </Text>
        <Button size="small" variant="secondary" onClick={() => setEditing({ handle: "", title: "", body: "", published: true })}>
          New page
        </Button>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Title</Table.HeaderCell>
            <Table.HeaderCell>URL</Table.HeaderCell>
            <Table.HeaderCell>Type</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.pages ?? []).map((p) => (
            <Table.Row key={p.id}>
              <Table.Cell>{p.title}</Table.Cell>
              <Table.Cell><code>/pages/{p.handle}</code></Table.Cell>
              <Table.Cell>{p.is_legal ? "Legal" : "Content"}</Table.Cell>
              <Table.Cell>{p.published ? "Published" : "Draft"}</Table.Cell>
              <Table.Cell className="text-right">
                <Button size="small" variant="transparent" onClick={() => setEditing(p)}>Edit</Button>
                <Button
                  size="small"
                  variant="transparent"
                  onClick={async () => {
                    if (await prompt({ title: "Delete page?", description: `“${p.title}” will be removed from the storefront.` }))
                      remove.mutate(p.id!)
                  }}
                >
                  Delete
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {editing && (
        <Drawer open onOpenChange={(o) => !o && setEditing(null)}>
          <Drawer.Content className="max-w-3xl">
            <Drawer.Header><Drawer.Title>{editing.id ? "Edit page" : "New page"}</Drawer.Title></Drawer.Header>
            <Drawer.Body className="flex flex-col gap-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-y-1">
                  <Label size="small">Title</Label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div className="flex flex-col gap-y-1">
                  <Label size="small">Handle</Label>
                  <Input value={editing.handle} onChange={(e) => setEditing({ ...editing, handle: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small">Content (Markdown)</Label>
                <Textarea rows={20} className="font-mono text-xs" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small">SEO title (optional)</Label>
                <Input value={editing.seo_title ?? ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small">SEO description (optional)</Label>
                <Textarea rows={2} value={editing.seo_description ?? ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} />
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={!!editing.published} onCheckedChange={(c) => setEditing({ ...editing, published: c })} />
                  <Label size="small">Published</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!editing.is_legal} onCheckedChange={(c) => setEditing({ ...editing, is_legal: c })} />
                  <Label size="small">Legal page (footer)</Label>
                </div>
              </div>
            </Drawer.Body>
            <Drawer.Footer>
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button isLoading={save.isPending} onClick={() => save.mutate(editing)}>Save</Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Storefront",
  icon: BuildingStorefront,
  rank: 2,
})

export default StorefrontPage
