import { Badge, Button, Container, Heading, Input, Label, Switch, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { api } from "../lib/sdk"

const ISSUE_LABELS: Record<string, string> = {
  missing_description: "Missing description",
  short_description: "Description under 50 characters",
  missing_images: "No images",
  missing_gtin: "No GTIN/EAN (barcode) – recommended for Google Shopping",
  missing_sku: "Some variants have no SKU",
  non_ascii_handle: "Handle contains special characters",
}

type Seo = {
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
  canonical_path: string | null
  noindex: boolean
  manual_fields: string[] | null
  issues: string[] | null
  generated_at: string | null
}

/**
 * SEO editor shared by product, collection and category widgets. Values are
 * generated automatically; typing into a field turns it into a manual override,
 * clearing it reverts to automatic.
 */
export const SeoPanel = ({ type, id, storefrontPath }: { type: "product" | "collection" | "category"; id: string; storefrontPath: string }) => {
  const qc = useQueryClient()
  const key = ["seo", type, id]
  const { data } = useQuery({ queryKey: key, queryFn: () => api<{ seo: Seo | null }>(`/admin/seo/${type}/${id}`) })
  const seo = data?.seo
  const [draft, setDraft] = useState({ meta_title: "", meta_description: "", og_image: "", canonical_path: "", noindex: false })

  useEffect(() => {
    if (seo) {
      setDraft({
        meta_title: seo.meta_title ?? "",
        meta_description: seo.meta_description ?? "",
        og_image: seo.og_image ?? "",
        canonical_path: seo.canonical_path ?? "",
        noindex: seo.noindex,
      })
    }
  }, [seo])

  const manual = new Set(seo?.manual_fields ?? [])
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {}
      for (const k of ["meta_title", "meta_description", "og_image", "canonical_path"] as const) {
        if (draft[k] !== (seo?.[k] ?? "")) body[k] = draft[k] || null
      }
      if (draft.noindex !== seo?.noindex) body.noindex = draft.noindex
      return api(`/admin/seo/${type}/${id}`, { method: "POST", body })
    },
    onSuccess: () => {
      toast.success("SEO saved")
      qc.invalidateQueries({ queryKey: key })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const reset = useMutation({
    mutationFn: async () => {
      await api(`/admin/seo/${type}/${id}`, {
        method: "POST",
        body: { meta_title: null, meta_description: null, og_image: null, canonical_path: null, noindex: null },
      })
      return api(`/admin/seo/${type}/${id}/regenerate`, { method: "POST" })
    },
    onSuccess: () => {
      toast.success("SEO regenerated")
      qc.invalidateQueries({ queryKey: key })
    },
  })

  const titleLen = draft.meta_title.length
  const descLen = draft.meta_description.length

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">SEO</Heading>
          <Text size="xsmall" className="text-ui-fg-subtle">Generated automatically · edit a field to override it</Text>
        </div>
        <Button size="small" variant="secondary" isLoading={reset.isPending} onClick={() => reset.mutate()}>
          Reset to automatic
        </Button>
      </div>
      <div className="px-6 py-4">
        <div className="rounded-lg border p-3">
          <Text size="xsmall" className="text-ui-fg-muted">Google preview</Text>
          <Text size="small" className="text-ui-fg-subtle truncate">{storefrontPath}</Text>
          <Text className="truncate" style={{ color: "#1a0dab" }}>{draft.meta_title || "—"}</Text>
          <Text size="small" className="text-ui-fg-subtle line-clamp-2">{draft.meta_description || "—"}</Text>
        </div>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Label size="small" weight="plus">
            Meta title {manual.has("meta_title") && <Badge size="2xsmall">manual</Badge>}
          </Label>
          <Input value={draft.meta_title} onChange={(e) => setDraft({ ...draft, meta_title: e.target.value })} />
          <Text size="xsmall" className={titleLen > 60 ? "text-ui-fg-error" : "text-ui-fg-muted"}>{titleLen}/60</Text>
        </div>
        <div className="flex flex-col gap-y-1">
          <Label size="small" weight="plus">
            Meta description {manual.has("meta_description") && <Badge size="2xsmall">manual</Badge>}
          </Label>
          <Textarea rows={3} value={draft.meta_description} onChange={(e) => setDraft({ ...draft, meta_description: e.target.value })} />
          <Text size="xsmall" className={descLen > 160 ? "text-ui-fg-error" : "text-ui-fg-muted"}>{descLen}/155</Text>
        </div>
        <div className="flex flex-col gap-y-1">
          <Label size="small" weight="plus">Social image URL {manual.has("og_image") && <Badge size="2xsmall">manual</Badge>}</Label>
          <Input value={draft.og_image} onChange={(e) => setDraft({ ...draft, og_image: e.target.value })} />
        </div>
        <div className="flex flex-col gap-y-1">
          <Label size="small" weight="plus">Canonical path {manual.has("canonical_path") && <Badge size="2xsmall">manual</Badge>}</Label>
          <Input value={draft.canonical_path} onChange={(e) => setDraft({ ...draft, canonical_path: e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={draft.noindex} onCheckedChange={(c) => setDraft({ ...draft, noindex: c })} />
          <Label size="small">Hide from search engines (noindex, excluded from sitemap)</Label>
        </div>
        {!!seo?.issues?.length && (
          <div className="rounded-lg bg-ui-bg-subtle p-3">
            <Text size="xsmall" weight="plus">Suggestions</Text>
            <ul className="mt-1 list-disc pl-4">
              {seo.issues.map((i) => (
                <li key={i}><Text size="xsmall">{ISSUE_LABELS[i] ?? i}</Text></li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end">
          <Button size="small" isLoading={save.isPending} onClick={() => save.mutate()}>Save SEO</Button>
        </div>
      </div>
    </Container>
  )
}
