import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { sdk } from "../medusa"
import { DEFAULT_COUNTRY } from "../env"

/** The store sells in a single region (România); resolved by country code. */
export async function getRegion(): Promise<HttpTypes.StoreRegion | null> {
  try {
    const { regions } = await sdk.client.fetch<{ regions: HttpTypes.StoreRegion[] }>("/store/regions", {
      next: { revalidate: 3600, tags: ["regions"] },
      cache: "force-cache",
    })
    return regions.find((r) => r.countries?.some((c) => c.iso_2 === DEFAULT_COUNTRY)) ?? regions[0] ?? null
  } catch {
    return null
  }
}
