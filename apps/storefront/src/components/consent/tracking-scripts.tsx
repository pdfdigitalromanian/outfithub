"use client"

import Script from "next/script"
import { useConsent } from "../providers"
import type { TrackingConfig } from "@/lib/data/content"

/**
 * Loads third-party tags strictly according to consent:
 *  - Google Consent Mode v2 defaults are set to "denied" before any tag.
 *  - GA4/GTM load after analytics (or marketing for Ads) consent.
 *  - Meta Pixel and TikTok Pixel load only after marketing consent.
 * IDs come from Admin → Integrations (public fields only).
 */
export function TrackingScripts({ config }: { config: TrackingConfig }) {
  const { consent } = useConsent()
  const ga = config.google_analytics?.measurement_id
  const gtm = config.google_analytics?.gtm_container_id
  const ads = config.google_analytics?.google_ads_id
  const metaPixel = config.meta?.pixel_id
  const tiktokPixel = config.tiktok_events?.pixel_code
  const analytics = !!consent?.analytics
  const marketing = !!consent?.marketing
  const googleAllowed = (analytics && (ga || gtm)) || (marketing && ads)

  return (
    <>

      {googleAllowed && (ga || ads) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent((ga || ads)!)}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`gtag('js', new Date());${ga && analytics ? `gtag('config', ${JSON.stringify(ga)}, { send_page_view: true });` : ""}${ads && marketing ? `gtag('config', ${JSON.stringify(ads)});` : ""}`}
          </Script>
        </>
      )}

      {analytics && gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtm)});`}
        </Script>
      )}

      {marketing && metaPixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(metaPixel)});fbq('track','PageView');`}
        </Script>
      )}

      {marketing && tiktokPixel && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(${JSON.stringify(tiktokPixel)});ttq.page();}(window, document, 'ttq');`}
        </Script>
      )}
    </>
  )
}
