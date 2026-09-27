import { MedusaService } from "@medusajs/framework/utils"
import ContentEntry from "./models/content-entry"
import ContentPage from "./models/content-page"
import { CONTENT_DEFAULTS, ContentKey } from "../../lib/content/defaults"

class ContentModuleService extends MedusaService({ ContentEntry, ContentPage }) {
  async getValue<K extends ContentKey>(key: K): Promise<(typeof CONTENT_DEFAULTS)[K]> {
    const [entry] = await this.listContentEntries({ key })
    const fallback = CONTENT_DEFAULTS[key]
    if (!entry) {
      return fallback
    }
    const value = entry.value as Record<string, unknown>
    return (Array.isArray(fallback) ? value : { ...fallback, ...value }) as (typeof CONTENT_DEFAULTS)[K]
  }

  async setValue(key: ContentKey, value: Record<string, unknown>) {
    const [entry] = await this.listContentEntries({ key })
    if (entry) {
      await this.updateContentEntries({ id: entry.id, value })
    } else {
      await this.createContentEntries({ key, value })
    }
    return this.getValue(key)
  }

  async getAll() {
    const keys = Object.keys(CONTENT_DEFAULTS) as ContentKey[]
    const values = await Promise.all(keys.map((k) => this.getValue(k)))
    return Object.fromEntries(keys.map((k, i) => [k, values[i]])) as {
      [K in ContentKey]: (typeof CONTENT_DEFAULTS)[K]
    }
  }
}

export default ContentModuleService
