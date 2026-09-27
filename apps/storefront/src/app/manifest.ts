import type { MetadataRoute } from "next"
import { getStoreConfig } from "@/lib/data/content"

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { content } = await getStoreConfig()
  const name = content.seo.site_name || "OutfitHub"
  return {
    id: "/",
    name,
    short_name: name,
    description: content.seo.default_description,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f3ee",
    theme_color: "#f6f3ee",
    lang: "ro",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Magazin", url: "/shop" },
      { name: "Coș", url: "/cart" },
      { name: "Favorite", url: "/wishlist" },
      { name: "Comenzile mele", url: "/account/orders" },
    ],
  }
}
