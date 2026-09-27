import { ImageResponse } from "next/og"
import { getStoreConfig } from "@/lib/data/content"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "OutfitHub"

/** Default social image (used when no custom OG image is set in the admin). */
export default async function OgImage() {
  const { content } = await getStoreConfig()
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: "#f6f3ee", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 56, background: "#161513", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 24, height: 24, borderRadius: 24, border: "5px solid #f6f3ee" }} />
          </div>
          <div style={{ fontSize: 44, color: "#161513", letterSpacing: -1 }}>{content.seo.site_name}</div>
        </div>
        <div style={{ fontSize: 76, color: "#161513", lineHeight: 1.02, letterSpacing: -2, maxWidth: 980 }}>{content.homepage.hero.title}</div>
        <div style={{ fontSize: 26, color: "#6c675f" }}>{content.seo.default_description}</div>
      </div>
    ),
    size
  )
}
