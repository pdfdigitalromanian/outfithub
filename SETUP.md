# OutfitHub – setup checklist

The core customer journey and provider adapters are implemented. Live provider
validation, merchant approvals and the limitations in IMPLEMENTATION_STATUS.md
still need attention. Work top to bottom. Items marked
**(optional)** can be skipped for launch.

Legend: `backend env` = environment variables of the Medusa server (and worker);
`storefront env` = Vercel → Project → Settings → Environment Variables.

---

## 1. Local run (15 minutes)

- [ ] Install Node.js 24 LTS (`nvm use`, minimum 24.15.0) and Docker Desktop.
- [ ] `docker compose up -d` (Postgres 16 + Redis 7 from `docker-compose.yml`).
- [ ] `npm install` (installs both apps via the root postinstall script)
- [ ] `cp apps/backend/.env.example apps/backend/.env` and fill:
  - [ ] `JWT_SECRET`, `COOKIE_SECRET`, `INTEGRATIONS_ENCRYPTION_KEY` → run `openssl rand -hex 32` three times.
- [ ] `npm run setup:db` → runs migrations + seed. **Copy the printed publishable key.**
- [ ] `(cd apps/backend && npx medusa user -e you@example.com -p 'replace-with-a-strong-password')` (admin login).
- [ ] `cp apps/storefront/.env.example apps/storefront/.env.local`, set `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` to the printed key.
- [ ] `npm run dev` starts both apps and prints their URLs (defaults: admin http://localhost:9000/app, storefront http://localhost:3000).
- [ ] Place a test order with “Plata la livrare”.

## 2. Database – Supabase

- [ ] Create a project at https://supabase.com/dashboard → **New project** (region: *Central EU (Frankfurt)*).
- [ ] **Project Settings → Database → Connection string → Session pooler** (port 5432) → copy URI.
- [ ] Backend env: `DATABASE_URL=<uri>` and `DATABASE_SSL=true`.
- [ ] Run once against production: `cd apps/backend && npx medusa db:migrate && npm run seed` (seed only on an empty DB).

## 3. Product images – Supabase Storage (S3 compatible)

- [ ] Supabase → **Storage → New bucket** `products`, toggle **Public bucket**.
- [ ] **Storage → Settings → S3 Connection** → enable, **New access key**.
- [ ] Backend env: `S3_BUCKET=products`, `S3_REGION` (shown on that page), `S3_ENDPOINT=https://<ref>.supabase.co/storage/v1/s3`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FILE_URL=https://<ref>.supabase.co/storage/v1/object/public/products`.
- [ ] Storefront env: `NEXT_PUBLIC_IMAGE_HOST=<ref>.supabase.co` (allows next/image to optimize them).

## 4. Redis

- [ ] Create a Redis database (Upstash: https://console.upstash.com → **Create database**, region eu-central-1; or Railway/Redis Cloud).
- [ ] Backend env: `REDIS_URL=rediss://default:<password>@<host>:6379`.
- [ ] Verify Redis connectivity before opening the shop: authentication fails closed if its shared rate limiter is unavailable. Limits are 20 attempts/account/15 minutes and 300 requests/backend socket/minute. Add a WAF for per-shopper IP limits; do not trust arbitrary forwarding headers.

## 5. Deploy the Medusa backend

Any Node host works (Railway, Render, Fly.io, a VPS with Docker). `apps/backend/Dockerfile` builds a production image that migrates then starts.

- [ ] Create two services from `apps/backend` (same image & env):
  - [ ] **server**: `MEDUSA_WORKER_MODE=server`, public port 9000, domain e.g. `api.outfithub.ro`.
  - [ ] **worker**: `MEDUSA_WORKER_MODE=worker`, `DISABLE_MEDUSA_ADMIN=true`, no public port (runs subscribers and scheduled jobs: channel sync, Sameday tracking).
  - (A single instance with `MEDUSA_WORKER_MODE=shared` is fine for a small shop.)
- [ ] Backend env (both): all values from sections 2–4 plus
  - [ ] `NODE_ENV=production`
  - [ ] `MEDUSA_BACKEND_URL=https://api.outfithub.ro`
  - [ ] `STOREFRONT_URL=https://www.outfithub.ro`
  - [ ] `STORE_CORS=https://www.outfithub.ro`
  - [ ] `ADMIN_CORS=https://api.outfithub.ro`
  - [ ] `AUTH_CORS=https://api.outfithub.ro,https://www.outfithub.ro`
  - [ ] `JWT_SECRET`, `COOKIE_SECRET`, `INTEGRATIONS_ENCRYPTION_KEY` (new random values; **back up the encryption key** – without it stored credentials can’t be decrypted)
  - [ ] `STOREFRONT_REVALIDATE_SECRET` (random; same value as storefront `REVALIDATE_SECRET`)
- [ ] Create the admin user on the server: `npx medusa user -e <email> -p <password>`.
- [ ] Admin → **Settings → Publishable API Keys**: copy the key linked to “OutfitHub Web”.

## 6. Deploy the storefront to Vercel

- [ ] https://vercel.com/new → import the GitHub repo → **Root Directory: `apps/storefront`** (framework auto-detected).
- [ ] Environment variables (Production):
  - [ ] `MEDUSA_BACKEND_URL=https://api.outfithub.ro`
  - [ ] `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_…`
  - [ ] `NEXT_PUBLIC_BASE_URL=https://www.outfithub.ro`
  - [ ] `NEXT_PUBLIC_DEFAULT_REGION=ro`
  - [ ] `REVALIDATE_SECRET=<same as backend STOREFRONT_REVALIDATE_SECRET>`
  - [ ] `NEXT_PUBLIC_IMAGE_HOST=<ref>.supabase.co`
- [ ] Preview environment: add `NEXT_PUBLIC_NOINDEX=true` (previews are also blocked automatically via `VERCEL_ENV`).
- [ ] **Project → Settings → Domains**: add `www.outfithub.ro` (+ redirect apex), update DNS as instructed.

## 7. Store configuration in Medusa Admin (`https://api.outfithub.ro/app`)

- [ ] **Storefront → Company & legal**: legal name, CUI, Reg. Com., address, e-mail, phone (fills footer + legal pages).
- [ ] **Storefront → Pages & legal**: review every legal page **with a lawyer** (templates are a starting point).
- [ ] **Storefront → Social links / SEO defaults / Homepage / Announcement / Shipping & returns**.
- [ ] **Settings → Locations & Shipping → Depozit București**: set your real address; adjust Sameday prices and the free-shipping rule (item total ≥ 300).
- [ ] **Products**: delete demo products, create your own (images, colors/sizes, SKU, barcode/EAN, price in RON, stock). SEO is generated automatically; tweak it in the product’s **SEO** panel.
- [ ] **Settings → Tax regions → România**: confirm 21% VAT.

## 8. Sameday (shipping + Easybox)

- [ ] Sign a contract with Sameday (https://sameday.ro/business) and request **API access** (username/password). Ask for demo credentials too.
- [ ] Admin → **Integrations → Sameday → Configure**: environment, username, password → **Save & verify**. Pickup point, contact person and service IDs are filled automatically; check them.
- [ ] Click **Refresh Easybox list** (also runs daily). Easybox appears in checkout once connected.
- [ ] Toggle **Create AWB automatically**; otherwise use **Generate AWB** on the order page.

## 9. Payments

- [ ] Cash on delivery works out of the box (“Plata la livrare”).
- [ ] **(optional) Stripe cards**: https://dashboard.stripe.com → **Developers → API keys** → backend `STRIPE_API_KEY`, storefront `NEXT_PUBLIC_STRIPE_KEY`. **Developers → Webhooks → Add endpoint** `https://api.outfithub.ro/hooks/payment/stripe_stripe` (events `payment_intent.*`) → backend `STRIPE_WEBHOOK_SECRET`. Redeploy, then Admin → **Settings → Regions → România → Payment providers** → add Stripe.

## 10. E-mail

- [ ] **(recommended)** SendGrid: create API key (Settings → API Keys), verify sender domain, create dynamic templates for *order placed*, *password reset*, *shipment*, *admin invite* (uses `{{url}}`). Backend env `SENDGRID_API_KEY`, `SENDGRID_FROM`, `SENDGRID_TEMPLATE_*`. Without it, e-mails are only logged.

## 11. Google

- [ ] **GA4**: https://analytics.google.com → Admin → Create property → Web stream → copy **Measurement ID**. Data stream → **Measurement Protocol API secrets** → create. Admin → **Integrations → Google Analytics 4** → enter both, enable.
- [ ] **(optional) GTM / Google Ads**: add container / tag IDs in the same form.
- [ ] **Merchant Center**: https://merchants.google.com → create account, verify & claim `www.outfithub.ro`, configure shipping & returns (Settings → Shipping and returns).
- [ ] Google Cloud Console → new project → **APIs & Services → Enable “Merchant API”** → **IAM → Service accounts → Create** → **Keys → Add key → JSON**.
- [ ] Merchant Center → **Settings → People and access → Add person**: the service-account e-mail, role *Admin* (or *Standard*).
- [ ] Merchant Center → first API call registration: https://developers.google.com/merchant/api/guides/quickstart (register the GCP project with your merchant account).
- [ ] Admin → **Integrations → Google Merchant Center**: merchant ID, feed label `RO`, language `ro`, paste the JSON key → **Save & verify** → **Create API data source** (if you don’t have one) → enable.
- [ ] Admin → **Channel sync → Resync catalog**. Issues reported by Google appear per product within ~1h.

## 12. Meta (Facebook / Instagram)

- [ ] https://business.facebook.com → **Events Manager → Connect data source → Web** → copy **Pixel/Dataset ID**.
- [ ] **Commerce Manager → Add catalog** (E-commerce) → copy **Catalog ID**; verify domain in **Business settings → Brand safety → Domains**.
- [ ] **Business settings → Users → System users → Add** (Admin) → **Assign assets** (catalog: manage, pixel) → **Generate token** with `catalog_management`, `business_management`, `ads_management`.
- [ ] (optional, webhooks) https://developers.facebook.com → your app → **App settings → Basic → App secret**.
- [ ] Admin → **Integrations → Meta**: pixel ID, catalog ID, token, (app secret, verify token) → **Save & verify** → enable.
- [ ] Facebook/Instagram Shops eligibility and checkout availability depend on Meta’s country rules; the catalog powers Advantage+ catalog ads regardless.

## 13. TikTok

- [ ] **Pixel & Events API**: https://ads.tiktok.com → **Tools → Events → Web events → Create pixel** (manual setup) → copy pixel code → **Settings → Generate access token**. Advertiser ID is in the account menu. Admin → **Integrations → TikTok Pixel & Events API**.
- [ ] **TikTok Shop (requires an approved seller account in a supported market)**: https://partner.tiktokshop.com → create a Custom/Public app → note **App key, App secret, Service ID**; set **Redirect URL** `https://api.outfithub.ro/integrations/tiktok-shop/callback` and webhook `https://api.outfithub.ro/webhooks/tiktok-shop`; request product/logistics scopes.
- [ ] Admin → **Integrations → TikTok Shop**: app key, secret, service ID, default category ID → **Save & verify** → **Authorize seller** → approve in TikTok → enable.

## 14. Go-live checks

- [ ] Admin → **Integrations**: every enabled integration shows **Connected**.
- [ ] Place a real order with each delivery method; generate an AWB and download the label.
- [ ] Stripe: test successful payment, declined payment, 3DS and a redirect payment return to `/checkout/return`. The backend must confirm payment before an order is shown.
- [ ] Meta: confirm a queued catalog batch advances from Processing to Synced (or Error); submitting a batch alone is not confirmation.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run test:e2e`, and `npm run build` in the deployment environment. For local HTTP tests use `DB_HOST=localhost` (the Medusa test helper forces SSL for `127.0.0.1`).
- [ ] Google Search Console → add property → submit `https://www.outfithub.ro/sitemap.xml`.
- [ ] Test the cookie banner (reject → no GA/Meta/TikTok requests in DevTools Network).
- [ ] Install the site on a phone (Add to Home Screen).
- [ ] Remove `NEXT_PUBLIC_NOINDEX` from production if it was set.
