# ResDrop — Pre-Launch Security Audit

**Date:** 2026-07-29  ·  **Scope:** focused pre-Reddit-launch pass on the highest-risk
paths (auth, authorization/IDOR, inbound email, file uploads, secrets, headers,
cost controls, payments). This is **not** an exhaustive 24-phase review — areas
explicitly *not* deeply verified are listed in §7 so they aren't mistaken for
"cleared."

## 1. Executive summary
One **Critical** issue was found and **fixed**: the inbound-email webhooks
processed messages even with no secret configured (fail-open), allowing
unauthenticated booking injection into arbitrary accounts by spoofing the `From`
address. It now fails closed and is covered by tests.

Core authentication and per-object authorization are **sound**: passwords are
bcrypt-hashed, hashes are stripped from responses, and every booking/user/import
route enforces backend ownership checks. Remaining issues are High/Medium and
mostly require owner configuration or a scoped follow-up (per-user inbound
address, CSP, rate-limiting a few public endpoints).

**Launch decision: CONDITIONAL GO** — safe to launch once the owner completes
the manual items in §6 and `REDDIT_LAUNCH_CHECKLIST.md`.

## 2. Architecture & data flow (as built)
- **Frontend:** React 19 + Vite 7 (SPA), deployed on Vercel.
- **Backend:** Node ESM + Express 5, deployed on Railway. `server/index.js` is
  the route registry.
- **Data:** Supabase (PostgREST) is the source of truth via `server/supabase-rest.js`;
  a direct `postgres` client (`sql`) mirrors best-effort to a separate DB.
- **Auth:** custom — bcryptjs, opaque 256-bit bearer tokens (`server/index.js`
  `authMiddleware`), in-memory token cache (`server/authCache.js`).
- **Email:** outbound via Resend/SMTP; inbound via a Cloudflare Email Worker →
  `POST /api/inbound/*` webhook (`server/routes/inbound-email.js`), plus an
  optional IMAP poller.
- **Files:** uploads via multer **memoryStorage** (`server/routes/documents.js`),
  parsed in-memory (pdf-parse, xlsx, tesseract) — deterministic, **no AI**.
- **Hotel data:** Nuitée/LiteAPI (`server/liteApi.js`) + SerpApi Google Hotels
  (`server/serpApi.js`), called on fixed provider endpoints.
- **Jobs:** in-process cost-capped monitoring scheduler (`server/scheduler.js`).
- **Payments:** Stripe Checkout (subscription) + signature-verified webhook
  (`server/stripe.js`, `POST /api/stripe/webhook`).

Data-flow (abbreviated): signup/login → bearer token → authed API. Booking
create (manual/import) → `db.createBooking` scoped to `req.userEmail`. Inbound
email → CF worker (secret) → webhook → deterministic extract → booking for the
matched account. Monitoring → SerpApi/Nuitée → alert (email + push) on a *new*
drop only. Checkout → Stripe → webhook sets plan.

## 3. Findings

| # | Severity | Finding | Evidence | Status |
|---|----------|---------|----------|--------|
| 1 | **Critical** | Inbound webhooks **fail open** — with `INBOUND_WEBHOOK_SECRET` unset they processed emails anyway, enabling unauthenticated booking injection into any account via `From` spoofing. | `routes/inbound-email.js` (old `else { console.warn }` at both routes) | **Fixed** — now returns 503 when no secret; 401 on mismatch; constant-time compare. Tests: `inbound_webhook_auth.test.js`. |
| 2 | **High** | Inbound email→account association trusts the spoofable `From` address (`getUser(senderEmail)` → auto-create booking). Even with the secret, an email sent to `reservas@` with a forged `From` targets a known user. | `routes/inbound-email.js:482-500` | **Partially mitigated / documented.** Gated behind the CF pipeline + secret (fix #1). Full fix = per-user inbound alias; see §6. Recommend keeping inbound email disabled until then. |
| 3 | **Medium** | `dangerouslySetInnerHTML` renders raw Nuitée provider HTML (description, important-info) — stored-XSS surface if the provider returns malicious markup. | `src/components/HotelDetailsModal.jsx:296,447` | **Documented.** Low likelihood (trusted provider), limited exposure (catalogue hotels). Recommend sanitizing. |
| 4 | **Medium** | No `Content-Security-Policy` header on served pages (other headers present: `X-Frame-Options: DENY`, `nosniff`, HSTS, `Referrer-Policy`). | `server/index.js` security-headers middleware | **Documented** — add CSP (defense-in-depth). |
| 5 | **Medium** | Public, unauthenticated, unrate-limited endpoints: `GET /api/hotels/search`, `GET /api/awin/*`, `/api/expedia/*`. Scraping / minor abuse. `hotels/search` uses the in-memory catalogue (no external cost). | route inventory, `server/index.js` | **Documented** — add IP rate-limit. |
| 6 | **Medium** | File upload `fileFilter` accepts on MIME **or** filename extension (no magic-byte validation). | `server/routes/documents.js:13-24` | **Documented** — mitigated by memoryStorage (never written/executed) + graceful parser failure; recommend a signature check. |
| 7 | **Low/Info** | Dependency advisories: build-time tooling (`@babel/core`, `esbuild` dev-server, `postcss`, `js-yaml`, `brace-expansion`) and server `body-parser`. | `npm audit` | **Partly fixed** (`npm audit fix` applied). Build-time deps aren't shipped; `body-parser` DoS requires an *invalid* limit (ours is a valid `'1mb'`). Remainder needs a major upgrade — deferred. |

## 4. Verified controls (evidence of good posture)
- **AuthZ / IDOR:** every `:id`/`:email` route enforces backend ownership —
  `booking.email !== req.userEmail` (7 sites incl. GET/PUT/DELETE/`:id/hotel`/
  `:id/check`/`:id/attachments`, `server/index.js:1078-1266`); import ownership
  in `routes/inbound-email.js:952,974`; user routes `1750-1762`. Admin routes all
  use `authMiddleware, adminMiddleware`.
- **Passwords:** bcrypt cost 10 (`index.js:1596`); `getUser` strips
  `passwordHash` (`db.js`); login uses `getUserWithPassword` only for `bcrypt.compare`.
- **Reset tokens:** sha256-hashed, single-use (`usedAt`), expiring (`expiresAt`).
- **Rate limits:** login (15/15m), signup (10/h), reset (5/h), reset-submit,
  booking, parse (`index.js` `rateLimit`).
- **CORS:** restricted to `resdrop.app` + localhost (`index.js` cors config).
- **SQL:** all `sql\`...\`` use the `postgres` lib's parameterized tagged
  templates (e.g. `nuiteeRoutes.js:190`) — not string concatenation.
- **Stripe webhook:** signature-verified via raw body (`stripe.js`
  `constructWebhookEvent`, `index.js` express.json `verify`).
- **Secrets:** `server/.env` is git-ignored; no `.env` tracked in the repo.
- **Cost controls:** monitoring daily budget + per-booking cadence
  (`scheduler.js`); alerts only fire on a *new* drop (`index.js` `isNewDrop`).
- **No AI dependency** on the extraction path (deterministic extractors).

## 5. Exploit scenario for the Critical (now fixed)
Before the fix, if `INBOUND_WEBHOOK_SECRET` was unset in production, an attacker
runs `POST /api/inbound/webhook {"from":"victim@known.com", ...}` (or emails
`reservas@resdrop.app` with a forged `From`). The handler looked up the victim by
that address and **auto-created a booking in their account**, polluting their
data, consuming their plan quota, triggering monitoring cost, and emailing them.
Now the endpoint returns 503 without a configured secret and 401 on mismatch.

## 6. Manual actions required (owner)
1. **Set `INBOUND_WEBHOOK_SECRET`** on Railway if inbound email is used — else the
   endpoint now correctly rejects all requests (safe).
2. **Prefer per-user inbound aliases** (e.g. `reservas+<token>@`) before promoting
   the email-forward feature, so association isn't `From`-based (finding #2).
3. Rotate any secret ever pasted into chat/screenshots (the VAPID pair shown
   earlier; and never screenshot `sk_live_…`).
4. Confirm production sets: strong `TOKEN`/session secret, `CORS_ORIGIN`,
   `INBOUND_WEBHOOK_SECRET`, Stripe + VAPID vars, `MONITOR_DAILY_BUDGET`.
5. Configure Supabase backups + Row-Level Security review (not verifiable from
   the repo).

## 7. Not deeply verified this pass (recommended follow-up)
SSRF deep-dive on enrichment redirects; full spreadsheet formula-injection review;
Supabase RLS as a second layer; attachment retention/deletion policy; admin
action audit completeness; load testing; source-map exposure on Vercel; CSP
authoring. None showed an obvious critical issue in spot checks, but they were
not exhaustively tested — treat as open until reviewed.
