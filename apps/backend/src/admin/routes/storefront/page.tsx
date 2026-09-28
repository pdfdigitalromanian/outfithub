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
  { key: "homepage", label: "Pagina principală", help: "Secțiunea principală, blocul editorial, colecțiile recomandate (identificatori URL) și beneficiile magazinului." },
  { key: "company", label: "Firmă și date legale", help: "Datele firmei, utilizate în subsol și în paginile legale ({{company.*}})." },
  { key: "social", label: "Rețele sociale", help: "Adresele complete ale profilurilor. Linkurile necompletate sunt ascunse." },
  { key: "seo", label: "Setări SEO implicite", help: "Numele magazinului, șablonul titlului (%s = titlul paginii) și șabloanele SEO pentru produse ({title}, {collection}, {excerpt})." },
  { key: "announcement", label: "Bară de anunțuri", help: "Mesajul afișat în partea de sus a paginii." },
  { key: "shipping", label: "Livrare și retururi", help: "Valorile afișate în coș și pe paginile de livrare și retururi. Tarifele se configurează în Setări → Locații și livrare." },
]

const FIELD_LABELS: Record<string, string> = {
  "hero": "Secțiunea principală",
  "eyebrow": "Supratitlu",
  "title": "Titlu",
  "subtitle": "Subtitlu",
  "cta_label": "Textul butonului principal",
  "cta_href": "Linkul butonului principal",
  "secondary_label": "Textul butonului secundar",
  "secondary_href": "Linkul butonului secundar",
  "image_url": "URL imagine",
  "image_alt": "Descriere alternativă imagine",
  "featured_collections": "Colecții recomandate",
  "featured_title": "Titlul secțiunii recomandate",
  "editorial": "Secțiune editorială",
  "body": "Conținut",
  "usps": "Beneficii",
  "trade_name": "Denumire comercială",
  "legal_name": "Denumire firmă",
  "cui": "CUI",
  "reg_com": "Număr Registrul Comerțului",
  "address": "Adresă",
  "email": "E-mail",
  "phone": "Telefon",
  "support_hours": "Program de asistență",
  "site_name": "Numele magazinului",
  "title_template": "Șablon de titlu",
  "default_title": "Titlu implicit",
  "default_description": "Descriere implicită",
  "default_og_image": "Imagine socială implicită",
  "twitter_handle": "Identificator X / Twitter",
  "product_title_template": "Șablon titlu produs",
  "product_description_template": "Șablon descriere produs",
  "enabled": "Activat",
  "text": "Text",
  "href": "Link",
  "free_shipping_threshold": "Prag pentru livrare gratuită",
  "currency_code": "Cod monedă",
  "delivery_estimate": "Termen estimat de livrare",
  "returns_days": "Termen de retur (zile)"
}

const humanize = (k: string) => FIELD_LABELS[k] ?? k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())

const StorefrontPage = () => {
  const { data } = useQuery({
    queryKey: ["storefront-content"],
    queryFn: () => api<{ content: Record<string, any> }>("/admin/content"),
  })
  return (
    <div className="oh-admin flex flex-col gap-y-3">
      <Container className="px-6 py-4">
        <Heading level="h1">Magazin online</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Editează pagina principală, datele firmei, rețelele sociale, setările SEO și paginile legale. Modificările apar în magazin în aproximativ un minut.
        </Text>
      </Container>
      <Container className="p-0">
        <Tabs defaultValue="homepage">
          <Tabs.List className="oh-tabs px-4 pt-4 sm:px-6">
            {GROUPS.map((g) => (
              <Tabs.Trigger key={g.key} value={g.key}>{g.label}</Tabs.Trigger>
            ))}
            <Tabs.Trigger value="pages">Pagini și informații legale</Tabs.Trigger>
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
      toast.success("Salvat")
      qc.invalidateQueries({ queryKey: ["storefront-content"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <div className="flex flex-col gap-y-4">
      <ValueEditor value={draft} onChange={setDraft} path={group} />
      <div className="flex justify-end">
        <Button isLoading={save.isPending} onClick={() => save.mutate()}>Salvează</Button>
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
          id={path}
          value={value.join(", ")}
          placeholder="separate prin virgulă"
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
              <Button size="small" variant="transparent" onClick={() => onChange(value.filter((_, j) => j !== i))}>Elimină</Button>
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
            Adaugă element
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
      toast.success("Pagina a fost salvată")
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
      <div className="flex flex-wrap items-center justify-between gap-y-3 px-6 pb-4">
        <Text size="small" className="text-ui-fg-subtle">
          Pagini Markdown disponibile la /pages/&lt;identificator&gt;. Variabilele precum {"{{company.legal_name}}"} folosesc datele din Firmă și date legale. Verifică textele legale cu un specialist.
        </Text>
        <Button size="small" variant="secondary" onClick={() => setEditing({ handle: "", title: "", body: "", published: true })}>
          Pagină nouă
        </Button>
      </div>
      <div className="oh-table-scroll" role="region" aria-label="Tabel cu derulare orizontală" tabIndex={0}>
        <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Titlu</Table.HeaderCell>
            <Table.HeaderCell>URL</Table.HeaderCell>
            <Table.HeaderCell>Tip</Table.HeaderCell>
            <Table.HeaderCell>Stare</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.pages ?? []).map((p) => (
            <Table.Row key={p.id}>
              <Table.Cell>{p.title}</Table.Cell>
              <Table.Cell><code>/pages/{p.handle}</code></Table.Cell>
              <Table.Cell>{p.is_legal ? "Legală" : "Conținut"}</Table.Cell>
              <Table.Cell>{p.published ? "Publicat" : "Ciornă"}</Table.Cell>
              <Table.Cell className="text-right">
                <Button size="small" variant="transparent" onClick={() => setEditing(p)}>Editează</Button>
                <Button
                  size="small"
                  variant="transparent"
                  onClick={async () => {
                    if (await prompt({ title: "Ștergi pagina?", description: `„${p.title}” va fi eliminată din magazin.` }))
                      remove.mutate(p.id!)
                  }}
                >
                  Șterge
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
        </div>
      {editing && (
        <Drawer open onOpenChange={(o) => !o && setEditing(null)}>
          <Drawer.Content className="oh-admin-drawer max-w-3xl">
            <Drawer.Header><Drawer.Title>{editing.id ? "Editează pagina" : "Pagină nouă"}</Drawer.Title></Drawer.Header>
            <Drawer.Body className="flex flex-col gap-y-3 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-y-1">
                  <Label size="small">Titlu</Label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div className="flex flex-col gap-y-1">
                  <Label size="small">Identificator URL</Label>
                  <Input value={editing.handle} onChange={(e) => setEditing({ ...editing, handle: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small">Conținut (Markdown)</Label>
                <Textarea rows={20} className="font-mono text-xs" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small">Titlu SEO (opțional)</Label>
                <Input value={editing.seo_title ?? ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small">Descriere SEO (opțional)</Label>
                <Textarea rows={2} value={editing.seo_description ?? ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Switch checked={!!editing.published} onCheckedChange={(c) => setEditing({ ...editing, published: c })} />
                  <Label size="small">Publicat</Label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Switch checked={!!editing.is_legal} onCheckedChange={(c) => setEditing({ ...editing, is_legal: c })} />
                  <Label size="small">Pagină legală (subsol)</Label>
                </div>
              </div>
            </Drawer.Body>
            <Drawer.Footer>
              <Button variant="secondary" onClick={() => setEditing(null)}>Anulează</Button>
              <Button isLoading={save.isPending} onClick={() => save.mutate(editing)}>Salvează</Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Magazin online",
  icon: BuildingStorefront,
  rank: 2,
})

export default StorefrontPage
