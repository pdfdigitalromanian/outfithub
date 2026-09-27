import { MedusaService } from "@medusajs/framework/utils"
import SeoEntry from "./models/seo-entry"
import { asJson } from "../../lib/integrations/crypto"

export type SeoResourceType = "product" | "collection" | "category"

export const SEO_EDITABLE_FIELDS = [
  "meta_title",
  "meta_description",
  "og_image",
  "canonical_path",
  "image_alts",
  "noindex",
] as const

export type SeoEditableField = (typeof SEO_EDITABLE_FIELDS)[number]
export type SeoValues = Partial<Record<SeoEditableField, unknown>>

class SeoModuleService extends MedusaService({ SeoEntry }) {
  async getFor(resource_type: SeoResourceType, resource_id: string) {
    const [entry] = await this.listSeoEntries({ resource_type, resource_id })
    return entry ?? null
  }

  async getManyFor(resource_type: SeoResourceType, resource_ids: string[]) {
    if (!resource_ids.length) {
      return []
    }
    return this.listSeoEntries({ resource_type, resource_id: resource_ids })
  }

  /** Writes generated values, preserving any field an admin has overridden. */
  async applyGenerated(
    resource_type: SeoResourceType,
    resource_id: string,
    generated: SeoValues & { issues?: string[] }
  ) {
    const existing = await this.getFor(resource_type, resource_id)
    const manual = new Set<string>((existing?.manual_fields as string[] | null) ?? [])
    const data: Record<string, unknown> = { issues: generated.issues ?? [], generated_at: new Date() }
    for (const field of SEO_EDITABLE_FIELDS) {
      if (!manual.has(field) && generated[field] !== undefined) {
        data[field] = generated[field]
      }
    }
    if (existing) {
      return this.updateSeoEntries({ id: existing.id, ...data })
    }
    return this.createSeoEntries({ resource_type, resource_id, manual_fields: asJson([]), ...data })
  }

  /**
   * Admin override. A field set to a non-empty value becomes "manual"; sending
   * null/"" resets it to automatic generation.
   */
  async applyManual(resource_type: SeoResourceType, resource_id: string, values: SeoValues) {
    const existing = await this.getFor(resource_type, resource_id)
    const manual = new Set<string>((existing?.manual_fields as string[] | null) ?? [])
    const data: Record<string, unknown> = {}
    for (const field of SEO_EDITABLE_FIELDS) {
      if (!(field in values)) {
        continue
      }
      const v = values[field]
      const empty = v === null || v === "" || (typeof v === "object" && v !== null && !Object.keys(v).length)
      if (empty) {
        manual.delete(field)
      } else {
        manual.add(field)
        data[field] = v
      }
    }
    data.manual_fields = [...manual]
    if (existing) {
      return this.updateSeoEntries({ id: existing.id, ...data })
    }
    return this.createSeoEntries({ resource_type, resource_id, ...data })
  }
}

export default SeoModuleService
