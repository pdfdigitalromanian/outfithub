import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Geist, Instrument_Serif } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { AnnouncementBar } from "@/components/layout/announcement-bar"
import { HideOnCheckout } from "@/components/layout/hide-on-checkout"
import { ConsentBanner } from "@/components/consent/consent-banner"
import { TrackingScripts } from "@/components/consent/tracking-scripts"
import { CONSENT_DEFAULTS_SCRIPT } from "@/components/consent/consent-defaults"
import { ServiceWorkerRegister } from "@/components/pwa/sw-register"
import { JsonLd } from "@/components/json-ld"
import { getStoreConfig } from "@/lib/data/content"
import { getCategories, getCollections } from "@/lib/data/products"
import { SITE_URL } from "@/lib/env"
import { absolute, organizationJsonLd, websiteJsonLd } from "@/lib/seo"

const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist", display: "swap" })
const serif = Instrument_Serif({ subsets: ["latin", "latin-ext"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" })

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getStoreConfig()
  const seo = content.seo
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: seo.default_title, template: seo.title_template || `%s | ${seo.site_name}` },
    description: seo.default_description,
    applicationName: seo.site_name,
    alternates: { canonical: SITE_URL },
    openGraph: {
      type: "website",
      siteName: seo.site_name,
      locale: "ro_RO",
      url: SITE_URL,
      title: seo.default_title,
      description: seo.default_description,
      images: seo.default_og_image ? [{ url: absolute(seo.default_og_image) }] : undefined,
    },
    twitter: { card: "summary_large_image", site: seo.twitter_handle || undefined },
    appleWebApp: { capable: true, title: seo.site_name, statusBarStyle: "default" },
    formatDetection: { telephone: false },
    other: { "mobile-web-app-capable": "yes" },
  }
}

export const viewport: Viewport = {
  themeColor: "#f6f3ee",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [config, categories, collections] = await Promise.all([getStoreConfig(), getCategories(), getCollections()])
  const { content } = config
  const topCategories = categories.filter((c) => !c.parent_category_id).map((c) => ({ handle: c.handle, name: c.name }))

  return (
    <html lang="ro" className={`${geist.variable} ${serif.variable}`}>
      <body className="min-h-dvh">
        <Script id="consent-defaults" strategy="beforeInteractive">
          {CONSENT_DEFAULTS_SCRIPT}
        </Script>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
          Sari la conținut
        </a>
        <Providers>
          <HideOnCheckout>
            <AnnouncementBar {...content.announcement} />
          </HideOnCheckout>
          <Header
            nav={{
              categories: topCategories,
              collections: collections.map((c) => ({ handle: c.handle, title: c.title })),
              siteName: content.seo.site_name || "OutfitHub",
              freeShippingThreshold: content.shipping.free_shipping_threshold,
            }}
          />
          <main id="main">{children}</main>
          <HideOnCheckout>
            <Footer config={config} categories={topCategories} />
          </HideOnCheckout>
          <ConsentBanner />
          <TrackingScripts config={config.tracking} />
        </Providers>
        <ServiceWorkerRegister />
        <JsonLd data={organizationJsonLd(content)} />
        <JsonLd data={websiteJsonLd(content.seo.site_name)} />
      </body>
    </html>
  )
}
