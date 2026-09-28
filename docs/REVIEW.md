# Gap-closing review — 28 September 2026

The attached autonomous-build brief was compared with the existing Medusa 2.21 / Next.js 16 implementation. The repository already contained the storefront journey, admin extensions, SEO, consent, PWA and real provider adapters. This review concentrated on correctness at the boundaries, local usability and fresh verification instead of rebuilding those systems.

## Changes made

- **Local startup:** root `npm install` installs both apps; root `npm run dev` starts both servers, derives the backend port from local configuration and leaves already occupied ports alone. Node 24 is pinned in `.nvmrc`, CI and the backend image. Added the missing storefront `.env.example`; fresh typechecks generate Next types first.
- **Account protection:** local-only return paths; bounded email, name and password input; Redis atomic auth counters (20 attempts/account/15 minutes, 300/backend socket/minute), hashed counter identifiers, retry headers and fail-closed behavior. Middleware is registered after Medusa body parsing so account limits actually apply. Development without Redis uses bounded in-memory counters.
- **Checkout:** validate Romanian address/phone input server-side; persist accepted terms and current consent before payment; finish redirect-based payments through the backend on `/checkout/return`, with retry/error states. URL parameters cannot claim payment success. Tracking does not load on that return page, and the client removes its query string. Confirmation no longer claims that a locally logged email has been delivered.
- **Easybox:** resolve locker ID against the backend locker cache; reject unavailable/unconfigured lockers and replace browser-supplied labels with canonical values. Search/geolocation requests cannot overwrite more recent selections.
- **Search and visual polish:** cancel stale requests, clear outdated suggestions, expose request failures, correct combobox state, show product-card keyboard focus, and fit homepage actions at phone widths.
- **Provider correctness:** response-body deadlines, bounded TikTok image requests, no silent Google stale-product deletion failures, and asynchronous Meta batches remain Processing until confirmed. Empty/unconfirmed batches cannot report Synced.
- **Credential redaction:** providers can echo rejected access tokens in errors. Stored and request credentials are redacted from integration status messages and sync errors. A real HTTP regression exposed this issue; dedicated tests now cover it.
- **PWA:** exclude account/cart/checkout/order/wishlist/API routes; do not persist private/no-store or redirected navigation responses; preserve the offline page when trimming; only delete this application's old caches.

## Fresh verification

- Installed both apps from their lockfiles.
- Migrated an isolated local PostgreSQL database and seeded five demo products plus eight content pages; used a separate local Redis instance.
- Backend unit tests: **40 passed** (9 suites).
- Storefront unit tests: **34 passed** (5 suites).
- Backend/admin and storefront TypeScript: passed. Storefront ESLint: passed.
- Storefront production build: passed, including the new payment-return route.
- Direct HTTP auth check with Redis: **20 × 401, then 429 with Retry-After: 900**.
- Manual rendering checks: desktop and phone homepage, tablet catalog, product, cart drawer, phone checkout, plus Medusa admin sign-in. The product selection added a real variant to a persisted cart.
- Backend HTTP integration tests: **12 passed** (2 suites), including auth throttling, encrypted credential storage, provider error redaction, endpoint authorization, content and validation.
- Backend and Medusa admin production build: passed.
- Production PWA: service worker activated; an unvisited URL returned the offline page with networking disabled; no private route was present in Cache Storage.
- One local production homepage sample measured LCP 528 ms and CLS 0. This is an unthrottled local observation, not a field or Lighthouse performance claim.
- Full production browser run: **42 passed, 7 intentionally skipped, 1 test-selector failure**. The failure matched both the application alert and Next.js route announcer; scoped the assertion to main and the desktop retest passed. Its mobile counterpart also passed. Thus all **43 applicable scenarios passed across the run and targeted retest**.
- After the final tracking-context correction, rebuilt the storefront and rechecked payment-return rejection and COD orders on both desktop and mobile. All four passed across the run and retry; a dependency-triggered backend restart interrupted the first desktop add-to-cart attempt.
- Coverage includes real COD orders on desktop/mobile, customer account lifecycle, wishlist, search/error recovery, payment-return rejection, SEO HTML/sitemap/robots/manifest, legal pages, 14 axe scans and overflow checks at 375/430/768/1024/1440/1920px. The seven mobile-project skips avoid duplicating explicitly sized responsive tests.

Initial browser runs against development were interrupted by backend reloads and slow cold compilation. Those runs are not counted as successful verification. The final browser run uses a production storefront on port 3100 and an unchanged backend, while the interactive development storefront remains on port 3000.

## Current local playground

The review's development storefront is `http://localhost:3000`; Medusa admin is `http://localhost:9100/app`. Port 9000 was already occupied by another project, so this checkout uses 9100. Local environment files are ignored by Git and contain the matching URLs and seeded publishable key.

The isolated review infrastructure uses PostgreSQL on 55432 (`/tmp/outfithub-review-pg`) and Redis on 56379. This is a disposable local playground, not production infrastructure or a permanent database backup. For a durable independent setup, follow SETUP.md with Docker or your own PostgreSQL/Redis and update both app environments. Do not overwrite existing environment files with examples while exploring the current playground.

To create your own admin login:

```sh
(cd apps/backend && npx medusa user -e you@example.com -p 'replace-with-a-strong-password')
```

## Remaining boundaries

- Stripe success/decline/3DS and live Sameday AWB/label/tracking require merchant credentials; the new payment return has negative-path coverage, not a live Stripe payment guarantee.
- Google Merchant, Meta catalog and TikTok Shop need actual account authorization, assets and eligibility. Their adapters are implemented, but no live successful catalog synchronization is claimed here. Meta batch polling behavior is covered with test fixtures.
- SendGrid delivery, Supabase/S3 storage, managed Redis, Vercel/backend deployment and CI execution on GitHub were not exercised in this review.
- Shipping prices are configured flat rates/free-shipping rules. Sameday estimateCost is implemented but is not used to calculate checkout prices.
- Search is intended for a boutique catalog; no external large-catalog search engine was added.
- No 21st.dev component was imported. Existing custom Radix-based components were retained and improved; the reference site was unavailable for direct comparison.
- No Netopia, SmartBill/Oblio or e-Factura adapter was added. Legal/company templates and merchant configuration need owner review before launch.
- Historical performance, provider-mock and admin-product-publication claims in IMPLEMENTATION_STATUS.md are distinguished from this review's fresh results. Local timings are not production performance guarantees.

See SETUP.md for the complete deployment and account checklist and docs/SECURITY.md for the security decisions.

## Romanian and responsive admin follow-up

- Romanian is initialized once per browser, while later profile language choices remain available.
- Added all 579 missing Romanian entries from the installed Medusa dictionary, plus terminology corrections; all 2,444 English keys now have Romanian counterparts. Tests check placeholders and rich-text tags.
- Translated custom content, integrations, channel sync, SEO and Sameday interfaces and controlled integration messages. Narrow dependency transforms cover password visibility and the draft-order extension without modifying installed packages.
- Improved narrow-screen layouts, tabs, action wrapping, table scrolling, drawers and touch controls. The initial authenticated visual matrix passed all 30 page/width combinations at 375–1920px.
- Final backend unit suite: **46 passed** (11 suites). Backend/admin/storefront TypeScript: passed. Backend and admin production builds: passed.
- Final browser coverage passed across the full run and targeted product retest: 30 page/width combinations, mobile navigation, integration/page drawers, native catalog/customer/promotion/settings screens, draft/product creation, and product/order details at 375/768/1440px. The product retest follows a fix for Medusa 2.21.1 rendering the same modal through two outlets; the retained table outlet now renders exactly one modal.
- Final storefront ESLint passed. The temporary browser-review administrator was removed after verification.
