# OutfitHub

Romanian fashion e-commerce platform: **Medusa v2.21** commerce backend + **Next.js 16** storefront,
with Sameday (home delivery + Easybox), Google Merchant Center, Meta, TikTok, GA4, cookie consent,
automated SEO and an installable PWA.

```
apps/
  backend/      Medusa v2 server + admin extensions (Node 24, Postgres, Redis)
  storefront/   Next.js 16 App Router storefront (deploys to Vercel)
docs/
  ARCHITECTURE.md   architecture & design decisions
SETUP.md            step-by-step checklist of what you still need to do (accounts, keys, deploy)
IMPLEMENTATION_STATUS.md   what is done / needs credentials / needs provider approval
```

## Quick start (local)

```bash
docker compose up -d                       # Postgres 16 + Redis 7
npm install
cp apps/backend/.env.example apps/backend/.env          # fill the 3 secrets (openssl rand -hex 32)
npm run setup:db                           # migrations + Romanian demo store; prints the publishable key
(cd apps/backend && npx medusa user -e admin@example.com -p 'replace-with-a-strong-password')
cp apps/storefront/.env.example apps/storefront/.env.local   # paste the publishable key
npm run dev             # starts backend + storefront; prints URLs
```

All variables are documented in [`.env.example`](.env.example). Integration credentials are **not**
environment variables: they are entered in **Admin → Integrations** and stored AES-256-GCM encrypted.

## What exists

### Storefront (`apps/storefront`) — IMPLEMENTED
- Editorial homepage (hero collage, USPs, new arrivals, category tiles, editorial block, collection rails) — all copy editable in the admin.
- Catalog: `/shop`, `/collections/[handle]`, `/categories/[handle]`, `/search` with filters (category, collection, size in stock, color, price range, in stock, on sale), sorting, “load more” pagination, instant search dialog (`/` or ⌘K).
- Product page: responsive gallery (swipe on mobile, lightbox), color/size picker with availability, `?variant=` deep links, sticky mobile buy bar, size guide, accordions, related + recently viewed, JSON-LD `ProductGroup`/`Offer` + breadcrumbs.
- Cart drawer + cart page (quantity, promo codes, free-shipping progress).
- Checkout: guest ordering without registration (optional sign-in for saved addresses), contact/address (Romanian counties, phone validation), Sameday home / **Easybox with searchable locker picker (text or geolocation)** / pickup, cash on delivery or Stripe Payment Element, terms consent, order confirmation.
- Customer accounts: register, login, password reset, profile, address book, order history + detail with AWB tracking link, wishlist (guest in localStorage, synced to the account after login).
- Legal & content pages from the admin (Terms, Privacy, Cookies, Delivery, Returns + withdrawal form, ANPC/SAL, About, Contact) with company-data tokens; ANPC SAL badge in the footer.
- SEO: per-page metadata, canonical URLs, Open Graph/Twitter, generated OG image, sitemap with image entries, robots (auto-noindex for previews), noindex for filtered listings.
- Cookie consent (4 categories, equal Accept/Reject, re-openable), Google Consent Mode v2, GA4/GTM/Google Ads/Meta Pixel/TikTok Pixel loaded only after consent, ecommerce events with purchase de-duplication.
- PWA: manifest, generated icons, service worker (offline page, cached assets), install button.
- Performance: ISR + tag-based cache purge, code-split overlays, AVIF/WebP images, CLS 0 on measured pages.
- Accessibility: axe (WCAG 2.1 AA) clean on key pages, keyboard-operable dialogs, labelled controls, reduced motion.

### Backend (`apps/backend`) — IMPLEMENTED
- Medusa commerce (products, variants, collections, categories, inventory, orders, customers, promotions, price lists, regions/taxes, returns) via the standard Medusa Admin.
- Seed: România region (RON, VAT-inclusive, 21% VAT), Sameday home + Easybox shipping options with free-shipping rule, demo catalog, default legal pages.
- Custom modules: `content` (storefront content + pages), `seo` (auto SEO with manual overrides), `wishlist`, `integrations` (encrypted credentials, connection status, channel sync state, logs, Sameday lockers & shipments).
- Automated SEO on product/collection/category create/update (ASCII slug, meta title/description, canonical, OG image, image alts, issues).
- Channel sync engine: Google Merchant API, Meta catalog, TikTok Shop — independent per channel, exponential back-off retries, nightly resync, hourly provider status pull, admin dashboard with manual retry.
- Sameday: fulfillment provider, credential test (auto-fills pickup point/services), Easybox locker cache, automatic AWB on fulfillment (Easybox `lockerLastMile`, COD amount), PDF label, tracking refresh job, cancellation.
- Server-side conversions (consent-aware): Meta Conversions API, TikTok Events API, GA4 Measurement Protocol.
- Webhooks: Meta (verify token + signature), TikTok Shop (signature); TikTok Shop OAuth callback with CSRF state.
- Emails: order confirmation and password reset through the Notification module (SendGrid or log).
- Admin extensions: **Storefront** (content + legal pages editor), **Integrations**, **Channel sync**, SEO panels on products/collections/categories, sales-channel status on products, Sameday panel on orders.

### CONFIGURATION REQUIRED (live validation pending)
Supabase Postgres/Storage, Redis, SendGrid, Stripe, GA4, Meta, TikTok Pixel/Events, Google Merchant, Sameday. See [SETUP.md](SETUP.md).

### EXTERNAL APPROVAL REQUIRED
Google Merchant Center account verification, Meta Commerce/catalog eligibility, **TikTok Shop seller approval (market availability)**, Sameday API contract, Stripe account activation.

### OPTIONAL
Stripe card payments, GTM, Google Ads tag, SendGrid templates, separate worker instance.

## Commands

`npm install` at the root installs both apps. `npm run dev` starts both servers,
reads the backend port from its local configuration, and reuses occupied ports
without terminating existing processes. Confirm any reused server is OutfitHub.

| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript for backend, admin and storefront |
| `npm run lint` | ESLint (storefront) |
| `npm test` | Backend unit tests (Jest) + storefront unit tests (Vitest) |
| `npm run test:integration` | Backend HTTP integration tests (needs Postgres) |
| `npm run test:admin` | Romanian admin and responsive browser checks (needs local admin credentials; see [docs/ADMIN.md](docs/ADMIN.md)) |
| `npm run test:e2e` | Playwright E2E + axe accessibility (needs both apps running + seeded DB) |
| `npm run build` | Production builds of both apps |

## Deployment

- **Storefront → Vercel** (Root Directory `apps/storefront`).
- **Backend → any Node/Docker host** (`apps/backend/Dockerfile`; server + worker instances), Supabase Postgres + Storage, managed Redis.

Detailed steps: [SETUP.md](SETUP.md). Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Gap-closing review (28 September 2026)

The review added account abuse protection backed by Redis, strict return-path and
checkout input validation, payment redirect completion, terms/consent recording,
canonical Easybox validation, search/locker request cancellation, accessible
product-card focus, provider response-body deadlines, and truthful asynchronous
Meta batch status. It also restored the missing storefront environment example and
made typechecking work after a fresh install with `next typegen`.

Use Node 24 (`nvm use`). New boundary tests cover these changes. Fresh verification
results and remaining constraints are recorded in [docs/REVIEW.md](docs/REVIEW.md).

## Known limitations

- Catalog filtering runs in the storefront over the cached catalog: great up to a few thousand products; beyond that add a search engine (Meilisearch/Algolia) behind `/api/search` and the listing pages.
- Sameday shipping prices are flat (configured per shipping option, with a free-shipping rule); live price estimation (`/api/awb/estimate-cost`) is implemented in the client but not used for checkout pricing.
- Integrations were verified against provider error responses (Google token endpoint) and a local Sameday API mock replicating the official SDK formats; they have **not** been exercised with real merchant accounts.
- Legal texts are templates aligned with Romanian law and must be reviewed by a lawyer.
- 21st.dev was unreachable from the build environment; equivalent components were built on Radix and the local design tokens.

Medusa administration now defaults to Romanian, with translated OutfitHub extensions and responsive layouts. Details and verification: [docs/ADMIN.md](docs/ADMIN.md).
