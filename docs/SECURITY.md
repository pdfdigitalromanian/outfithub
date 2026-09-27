# Security notes

## Secrets
- Integration credentials (Google service account, Meta/TikTok tokens, Sameday password, GA4 API secret) are stored AES-256-GCM encrypted (`INTEGRATIONS_ENCRYPTION_KEY`), write-only in the admin, masked in every API response, and never sent to the storefront. Rotating the key requires re-entering credentials.
- Storefront: only `NEXT_PUBLIC_*` values reach the browser (publishable key, site URL, optional Stripe publishable key). A scan of the production client bundle found no backend URL, secrets or tokens. Medusa access happens server-side (`server-only` modules).
- `.env*` files are git-ignored; `.env.example` contains no real values.

## Authentication & authorization
- `/admin/*` routes (including all custom ones) require an authenticated admin (Medusa auth middleware).
- `/store/customers/me/*` (wishlist) requires a customer token.
- Customer JWT and cart id live in httpOnly, `SameSite=Lax`, `Secure` (production) cookies; `oh_auth` is a non-sensitive UI flag.
- Account order pages check that the order belongs to the logged-in customer. The order confirmation page is reachable by its unguessable order ID (Medusa default for guest checkout).
- Login redirect targets (`next`) are restricted to same-site relative paths.
- Password reset responses don’t reveal whether an account exists.

## Webhooks & OAuth
- Meta: GET verification with a secret verify token (timing-safe compare), POST requires a valid `X-Hub-Signature-256` HMAC with the app secret (raw body preserved).
- TikTok Shop: `Authorization` header must equal HMAC-SHA256(app_key + raw body, app_secret).
- TikTok Shop OAuth callback validates a random, expiring `state` (CSRF).
- Storefront cache purge (`/api/revalidate`) requires a bearer secret (timing-safe compare) and only accepts well-formed tag names.

## Input validation
- All custom POST routes validate bodies with Zod (`src/api/validators.ts`); query parameters for locker search are validated and coerced.
- Admin content updates are sanitized against the default content shape (unknown keys dropped, types enforced, lengths capped).
- Markdown pages escape raw HTML before rendering; JSON-LD escapes `<`.
- Server actions validate e-mail, phone and address fields and cap lengths.

## Headers
- `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS, `Permissions-Policy`, CSP `frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'`.
- A full script-src CSP is not enabled because GTM/Meta/TikTok/Stripe scripts are loaded dynamically; add one with nonces if you drop some of them.

## Third-party scripts & privacy
- Analytics/marketing tags load only after explicit consent; Google Consent Mode v2 defaults are “denied”.
- Server-side conversion events are sent only when the shopper granted the matching consent category (stored on the cart).
- Stripe.js is loaded only when card payment is selected.

## Recommendations before launch
- Put both apps behind a WAF with rate limiting on `/auth/*`, `/store/carts/*/complete` and the storefront login/register actions (Vercel Firewall, Cloudflare).
- Restrict the Medusa admin by IP or SSO if possible; use strong admin passwords.
- Keep the Supabase Storage bucket public-read only; uploads go through the authenticated admin.
- Back up `INTEGRATIONS_ENCRYPTION_KEY` in a password manager.
- Next.js image optimization blocks private IPs in production (`dangerouslyAllowLocalIP` is development-only).
