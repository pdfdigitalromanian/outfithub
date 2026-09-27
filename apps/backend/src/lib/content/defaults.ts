/**
 * Default values for editable content. Everything here can be changed from the
 * admin (Settings → Storefront content) without touching code.
 */
export const CONTENT_DEFAULTS = {
  homepage: {
    hero: {
      eyebrow: "Colecția de sezon",
      title: "Haine gândite să fie purtate, nu doar privite.",
      subtitle:
        "Croieli relaxate, materiale care respiră și o paletă care se potrivește cu tot ce ai deja în dulap.",
      cta_label: "Descoperă colecția",
      cta_href: "/shop",
      secondary_label: "Noutăți",
      secondary_href: "/shop?sort=newest",
      image_url: "/images/hero.jpg",
      image_alt: "Model purtând o ținută OutfitHub din colecția de sezon",
    },
    featured_collections: [] as string[],
    featured_title: "Noutăți în magazin",
    editorial: {
      eyebrow: "Jurnal",
      title: "Mai puțin, dar mai bine.",
      body:
        "Construim fiecare piesă în jurul unui singur principiu: să o porți des. Bumbac greu, cusături curate, culori care nu obosesc.",
      cta_label: "Despre noi",
      cta_href: "/pages/despre-noi",
      image_url: "/images/editorial.jpg",
      image_alt: "Detaliu de material și cusături OutfitHub",
    },
    usps: [
      { title: "Livrare 24–48h", body: "Prin Sameday, la ușă sau în Easybox." },
      { title: "Retur 30 de zile", body: "Simplu, fără întrebări inutile." },
      { title: "Plată la livrare", body: "Sau online, securizat." },
    ],
  },
  company: {
    trade_name: "OutfitHub",
    legal_name: "",
    cui: "",
    reg_com: "",
    address: "",
    email: "contact@outfithub.ro",
    phone: "",
    support_hours: "Luni–Vineri, 09:00–17:00",
  },
  social: {
    instagram: "",
    tiktok: "",
    facebook: "",
    pinterest: "",
    youtube: "",
  },
  seo: {
    site_name: "OutfitHub",
    title_template: "%s | OutfitHub",
    default_title: "OutfitHub — haine și accesorii",
    default_description:
      "Magazin online de haine și accesorii. Livrare rapidă prin Sameday, la ușă sau în Easybox, retur 30 de zile.",
    default_og_image: "/images/og-default.jpg",
    twitter_handle: "",
    product_title_template: "{title} – {collection}",
    product_description_template: "{title}: {excerpt} Livrare rapidă în toată România, retur 30 de zile.",
  },
  announcement: {
    enabled: true,
    text: "Livrare gratuită pentru comenzile de peste 300 lei",
    href: "/pages/livrare",
  },
  shipping: {
    free_shipping_threshold: 300,
    currency_code: "ron",
    delivery_estimate: "1–2 zile lucrătoare",
    returns_days: 30,
  },
} as const

export type ContentKey = keyof typeof CONTENT_DEFAULTS
export const CONTENT_KEYS = Object.keys(CONTENT_DEFAULTS) as ContentKey[]
