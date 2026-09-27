# Implementation status

✅ Complete · 🟡 Implemented but requires credentials · 🟠 Requires provider approval/configuration · ❌ Not implemented

“Verified” notes say how each item was checked in this repository’s environment
(local Postgres + Redis, seeded store, Playwright against dev and production builds).

## Platform & infrastructure

| Requirement | Status | Notes |
| --- | --- | --- |
| Medusa v2 backend (2.21) | ✅ | Migrations, seed, admin build verified |
| Next.js 16 storefront | ✅ | Production build verified |
| PostgreSQL (Supabase) | 🟡 | Works with local Postgres; Supabase = set `DATABASE_URL` + `DATABASE_SSL=true` |
| Redis (events, workflows, cache, locks) | 🟡 | Verified with local Redis; production needs a managed Redis URL |
| File storage (Supabase Storage / S3) | 🟡 | Local file provider verified (upload via Admin API); S3 provider configured via env, not exercised |
| Server/worker split | ✅ | `MEDUSA_WORKER_MODE`, Dockerfile |
| `.env.example`, docker-compose, CI workflow | ✅ | CI not executed on GitHub from here |
| Vercel deployment config | ✅ | Root directory `apps/storefront`; build passes without a reachable backend |

## Storefront

| Requirement | Status | Notes |
| --- | --- | --- |
| Design system (tokens, typography, radii, glass) | ✅ | Visual QA at 375/390/768/1024/1440 |
| Homepage (editable) | ✅ | Content from Admin → Storefront |
| Collection / category / all-products listings | ✅ | E2E |
| Filters, sorting, pagination | ✅ | Unit + E2E |
| Search (instant + results page) | ✅ | E2E |
| Product page, variant selection, deep links | ✅ | E2E; CLS 0 |
| Related products, recently viewed | ✅ | Recently viewed requires “Preferences” consent |
| Wishlist (guest + account sync) | ✅ | E2E for guest and for merge into the account |
| Cart drawer + cart page, promo codes | ✅ | E2E; promo codes use Medusa Promotions |
| Checkout (address → delivery → payment → review) | ✅ | E2E COD order |
| Sameday home delivery option | ✅ | E2E |
| Easybox searchable selector storing canonical locker ID | ✅ | Verified end-to-end with Sameday API mock (`lockerLastMile=2011`) |
| Cash on delivery | ✅ | E2E |
| Stripe card payments | 🟡 | Payment Element integration implemented; needs Stripe keys (not exercised) |
| Order confirmation | ✅ | E2E |
| Customer accounts (register/login/profile/addresses/orders) | ✅ | E2E: register → wishlist merge → address → logout → failed/successful login |
| Password reset | 🟡 | Implemented; e-mail delivery needs SendGrid (logs locally) |
| Responsive navigation, mobile UX, sticky buy bar | ✅ | Visual QA |
| Empty, loading, error, 404, offline states | ✅ | |
| Legal pages: Terms, Privacy, Cookies, Shipping, Returns, ANPC/SAL | ✅ | Editable templates — lawyer review required |
| SEO metadata, canonical, OG, Twitter | ✅ | Verified in production HTML |
| Product / Breadcrumb / Organization / WebSite JSON-LD | ✅ | Unit + E2E |
| Sitemap (with images) + robots | ✅ | E2E; previews auto-noindex |
| PWA (manifest, icons, service worker, offline, install button) | ✅ | Manifest E2E; SW active in production builds only |
| Cookie consent + Google Consent Mode v2 | ✅ | E2E keyboard test; tags load only after consent |
| Analytics events (GA4 / Meta Pixel / TikTok Pixel) | 🟡 | Implemented; needs IDs in Admin → Integrations |
| Accessibility | ✅ | axe WCAG 2.1 AA: 0 serious/critical on 7 pages × 2 viewports |
| Performance | ✅ | LCP < 0.4 s locally, CLS 0; overlays/Stripe code-split |
| 21st.dev components | 🟠 | 21st.dev blocked by the build network; equivalent components hand-built on Radix |

## Admin (Medusa Admin + extensions)

| Requirement | Status | Notes |
| --- | --- | --- |
| Products, variants, images, SKU/GTIN, prices, inventory, publish | ✅ | Native Medusa; product workflow verified via Admin API (upload → create → stock → storefront → sitemap) |
| Collections, categories, orders, customers, discounts | ✅ | Native Medusa (Promotions) |
| Homepage content, company/legal info, social links, SEO defaults, announcement, shipping info | ✅ | Admin → Storefront |
| Legal/content pages editor | ✅ | Markdown with company tokens |
| Product/collection/category SEO panel with overrides | ✅ | Visual QA |
| Integrations page (status, Save & verify, Test connection, logs) | ✅ | Visual QA; states verified |
| Channel sync dashboard (per product/provider, retry failed, resync) | ✅ | Verified with a failing Google credential |
| Sameday order panel (AWB, label, tracking, cancel) | ✅ | Verified with Sameday API mock |
| Shipping configuration | ✅ | Native Medusa locations & shipping + Sameday integration |
| Analytics configuration | 🟡 | GA4/GTM/Ads IDs + MP secret in Integrations (no reporting dashboard — use GA4) |

## Automated SEO

| Requirement | Status | Notes |
| --- | --- | --- |
| Slug (ASCII, diacritics removed, collision-safe) | ✅ | Verified: “Cămașă Oversized Țesătură Ușoară” → `camasa-oversized-tesatura-usoara` |
| Meta title / description from templates, length-limited | ✅ | Unit tests |
| Canonical, OG image, image alt defaults | ✅ | |
| JSON-LD, breadcrumbs, sitemap inclusion | ✅ | |
| Manual overrides preserved on regeneration | ✅ | `manual_fields` |
| SEO issue detection (description, images, GTIN, SKU) | ✅ | Shown in admin |

## Integrations

| Integration | Status | Notes |
| --- | --- | --- |
| Encrypted credential storage, masked in UI/API | ✅ | AES-256-GCM; HTTP test confirms secrets never returned |
| Status model: Not configured / Authorization required / Error / Connected | ✅ | Verified against real Google token endpoint rejection and Sameday mock |
| Google Merchant API (products v1): auth, insert/upsert, delete, stale variant removal, price/availability, GTIN/identifier_exists, item group, data source creation, item-level issues | 🟡🟠 | Needs service account + Merchant Center account (verification/claim by Google) |
| Google Analytics 4 (gtag + Consent Mode + Measurement Protocol purchase) | 🟡 | Needs Measurement ID / API secret |
| Meta Pixel + Conversions API (Purchase, dedup) | 🟡 | Needs pixel ID + system user token |
| Meta catalog sync (items_batch upsert/delete, batch status check), webhooks | 🟡🟠 | Needs catalog; Shops eligibility depends on Meta |
| TikTok Pixel + Events API | 🟡 | Needs pixel code + access token |
| TikTok Shop (OAuth, signed API, product create/edit/delete, images, inventory, prices, webhooks) | 🟠 | Needs approved TikTok Shop seller account in a supported market + partner app |
| Sameday: auth, services, pickup points, lockers, AWB (home & Easybox, COD), label, tracking, cancel, status job | 🟡🟠 | Verified end-to-end against `integration-tests/mocks/sameday-mock.mjs` (official PHP SDK formats); needs Sameday API contract |
| SendGrid e-mails | 🟡 | Needs API key + templates |
| Stripe | 🟡 | Needs keys + webhook |
| Storefront cache purge from backend | ✅ | Verified (`/api/revalidate` 200) |

## Quality

| Check | Status |
| --- | --- |
| Typecheck (backend, admin, storefront) | ✅ |
| ESLint (storefront) | ✅ |
| Backend unit tests (26) | ✅ |
| Backend HTTP integration tests (11) | ✅ |
| Storefront unit tests (13) | ✅ |
| Playwright E2E: catalog, SEO endpoints, legal pages, wishlist, COD checkout, account lifecycle, axe a11y, horizontal-overflow at 375–1920 px (desktop + mobile projects) | ✅ |
| Backend production build (`medusa build`) | ✅ |
| Storefront production build | ✅ |
| Security review (secrets, auth, webhooks, validation, bundle scan) — see docs/SECURITY.md | ✅ |

## Not implemented / known gaps

| Item | Status | Notes |
| --- | --- | --- |
| Live Sameday price calculation at checkout | ❌ | Flat prices per option (client method `estimateCost` exists) |
| Netopia / other Romanian card processors | ❌ | Stripe provided; others need a Medusa payment provider |
| Search engine for very large catalogs | ❌ | In-process filtering is designed for boutique catalogs |
| Invoicing (SmartBill/Oblio e-Factura) | ❌ | Not in scope of the specification; recommended for Romanian compliance |
| Rate limiting on auth endpoints | ❌ | Use Vercel Firewall / Cloudflare rules in front of both apps |
