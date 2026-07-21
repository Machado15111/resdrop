# ResDrop — Implementation Prompt: Screenshot/PDF Review Flow, Low-Cost Extraction, and Inbound Email (reservas@resdrop.app)

> Paste this whole document into your coding AI. It covers items 3–11 of the
> product spec, grounded in the **real ResDrop codebase** so you don't have to
> rediscover the architecture. Read the "Codebase facts" section first — it
> tells you exactly which files to extend and the non-obvious gotchas that will
> otherwise waste your time.

---

## ROLE

You are a senior full-stack engineer working on the **existing** ResDrop codebase.
Do **not** rebuild the app, redesign unrelated pages, or change the stack.
Inspect only relevant files, make a ≤5-item plan, then implement immediately.
Minimize narration. Preserve all existing functionality, branding, auth,
subscriptions, navigation, translations, and responsive behavior.

---

## CODEBASE FACTS (read before coding — these are verified)

**Stack**
- Frontend: **React + Vite** in `src/`. Routing in `src/App.jsx`. Auth via
  `src/contexts/AuthContext.jsx` (`useAuth()` exposes `user`, `token`,
  `authFetch`). i18n via `src/i18n.jsx` (`useI18n()` → `t()`, `lang`, `setLang`).
  API base in `src/api.js` (`API` = `/api` in prod).
- Backend: **Express** in `server/` (`server/index.js`, ~2500 lines). Route
  modules live in `server/routes/*.js` and are mounted in `index.js`.
- DB: **Supabase Postgres**. Access via `server/db.js` which exports helper
  functions AND the raw client as `supabase` (a `postgres` tagged-template:
  ``import { supabase as sql } from './db.js'`` then ``sql`SELECT ...` ``).
  `db.js` reads `DATABASE_URL` and calls `process.exit(1)` if missing.
- Scheduler: `server/scheduler.js` — in-process `setInterval`, controlled by
  `MONITOR_CHECK_HOURS` env (e.g. `06,14,22`). Started from `index.js`.

**Deploy & DB gotchas (IMPORTANT — do not fight these)**
- **Deploy = `git push origin main`** to `github.com:Machado15111/resdrop.git`.
  A separate Vercel account auto-deploys the frontend to **resdrop.app**;
  Railway auto-deploys the backend. **Do NOT use `vercel deploy`** (wrong
  account/project). Live in ~15–30s after push.
- The working tree's `vercel.json` is the **Voyu** project's; the **committed**
  one is ResDrop's. Before committing: `git show HEAD:vercel.json > vercel.json`,
  commit with **explicit file paths** (never `git add -A` — it would pull in
  `voyu/` and the wrong vercel.json), then restore the Voyu one.
- **Migrations run automatically on Railway boot** via `server/run-migration.js`
  (start command: `node run-migration.js; node index.js`). Add new DDL there
  using the **proven inline tagged-template pattern**:
  ``await sql`CREATE TABLE IF NOT EXISTS ...`;`` and, for functions,
  ``await sql.unsafe(`CREATE OR REPLACE FUNCTION ... $fn$ ... $fn$`)`` — you may
  need `.simple()` on multi-statement `.unsafe()` calls.
  **You cannot run DDL through the Supabase REST client** (service key has no
  SQL endpoint). Locally there is no `DATABASE_URL`, but `SUPABASE_URL` +
  `SUPABASE_SERVICE_KEY` (REST) work for DATA (not DDL). Test DB logic by
  injecting a fake store (see `server/priceIndex.js` for the injectable pattern).
- Tests: `cd server && npm test` uses the **Node built-in test runner**
  (`node --test`, files `*.test.js`, `node:test` + `node:assert`). Frontend
  lint via `npx eslint <files>` (server files false-positive `'process' is not
  defined` — that's the browser eslint config, not a real error). Build:
  `npm run build` (Vite) at repo root.

**Existing pieces to EXTEND (do not duplicate)**
- `server/aiParser.js` — **OpenAI GPT-4o** client. `extractBookingFromDocument(buffer, mimetype)`
  returns extracted fields; `isAiParserConfigured()`; internal PDF text
  extraction (`extractPdfText`, pdf-parse v2 `PDFParse` class). Env: `OPENAI_API_KEY`.
- `server/routes/documents.js` — `multer` memory upload at
  **`POST /api/bookings/from-document`**; deterministic `extractBookingFields(text)`
  + PDF text extraction; falls back to `aiParser`. Mounted via `documentRoutes(authMiddleware)`.
- `server/routes/inbound-email.js` — currently a **webhook** endpoint
  `POST /api/webhooks/inbound-email` + `extractBookingFromEmail(text, subject)` +
  `GET /api/inbound/address`. It currently **creates a booking directly** — this
  must change to a **draft import + review** flow (see items 5–10). Mounted via
  `inboundEmailRoutes(authMiddleware)`.
- `src/components/DocumentUpload.jsx` — already has drag/drop, calls the upload
  endpoint, sets `extractedData`, and renders a **partial review UI**
  (`doc-review`). Extend this into the full review step (items 3, 10). Reachable
  from `src/components/SubmitBooking.jsx` / `SubmitBookingPage.jsx`.
- `server/hotelMapping.js` — reservation→Nuitée-hotel mapping with confidence
  (`mapReservation`, `scoreCandidate`). Reuse for the mapping step; do not rebuild.
- Outbound email: **Resend** is already configured (`RESEND_API_KEY`,
  `RESEND_FROM`, see `server/index.js` ~line 1724). Use it (or Nodemailer/SMTP
  per the env below) for the review/signup reply emails.
- DB helpers in `db.js`: `createBooking`, `getUser`, `getOrCreateUser`,
  `createSession`, `createPasswordReset`, `updateUser`, etc. `updateUser` accepts
  arbitrary columns (camelCase → snake_case). Add new columns via `ALTER TABLE
  ... ADD COLUMN IF NOT EXISTS` in `run-migration.js` (existing pattern).
- Plans: `PLANS` in `server/index.js` (`free`/`viajante`/`premium`). Auth:
  `authMiddleware` (sets `req.user`, `req.userEmail`), `adminMiddleware`
  (`ADMIN_EMAIL`). Rate limiting: `rateLimit(windowMs, max, keyFn)` helper.

**Hard rules**
- API keys and mailbox credentials are **server-side only** — never in the
  client, git, logs, or error messages.
- **Never start monitoring before explicit user confirmation.** Extraction
  creates a *draft import*, not an active booking.
- Keep AI usage minimal (item 4). Deterministic first, AI only when needed, cache
  by content hash.
- Default language is **Portuguese**; preserve the EN option. Add translations
  for every new label/error (follow the inline `lang === 'pt' ? … : …` pattern
  used in `DocumentUpload.jsx`/landing, or `t()` keys in `src/i18n.jsx`).

---

## SCOPE = SPEC ITEMS 3–11

Implement the following. Where a file already exists (above), **extend it**.

### 3. Add Booking with screenshot/image/paste (extend `DocumentUpload.jsx` + `routes/documents.js`)
- Support: **file select, drag & drop, clipboard paste (`onPaste` of an image),**
  and PDF (already partly supported). Wire clipboard paste on the drop zone and
  document.
- After upload: validate file (MIME allowlist: png/jpg/webp/pdf; size ≤ ~10MB;
  1 file), show a **preview** (image thumbnail or PDF filename), run extraction,
  then open a **Review Details step** with all fields pre-filled.
- **Do not create an active booking from unverified extraction.** Create a
  **draft `BookingImport`** (see item 11), then activate only on confirmation.
- Required fields for monitoring: hotel name; destination/city/country (when
  available); check-in; check-out; rooms; occupancy (when available); room type;
  total price; currency; refundability; cancellation deadline (when available);
  booking reference (when available); booking source (when available).
- Validation UI:
  - Missing **essential** field → **red border + red message**. Essential =
    hotel name, check-in, check-out, total price, currency. Example (check-out
    missing): PT `"Adicione a data de check-out para continuar."` /
    EN `"Add the check-out date to continue."`.
  - Uncertain-but-non-blocking (low confidence) → **amber warning**.
  - Valid fields → no warning. Every field editable. **Confirm disabled while any
    essential field is missing.**
- Review step layout: uploaded image shown next to/above the form; show which
  fields were extracted and which are low-confidence; allow replacing the file;
  actions **"Confirm booking"** and **"Go back"**. Booking is created/activated
  only after Confirm.

### 4. Low-cost extraction (extend `aiParser.js` + `routes/documents.js`)
- Order: **(1) deterministic parsers (`extractBookingFields`) → (2) OCR →
  (3) regex + date/currency normalization → (4) AI only if required fields are
  still missing/ambiguous.**
- Don't send an image to AI more than once unless the first call failed
  technically. Before any AI call: resize large images, compress safely, strip
  metadata, OCR first, send minimal context.
- For emails: strip signatures, forwarded chains, tracking; extract only the
  confirmation section.
- AI call: cheapest suitable **already-configured** model (GPT-4o is present; if
  a cheaper one like `gpt-4o-mini` is acceptable for extraction, prefer it),
  **temperature 0**, **strict JSON only**, defined schema, low output-token
  limit, no chain-of-thought, no prose. **Cache by file/content hash.**
- Output schema (each field `{value, confidence}`): `hotelName, city, country,
  checkIn, checkOut, rooms, adults, children, roomType, totalPrice, currency,
  refundable, cancellationDeadline, bookingReference, bookingSource`.
- **Validate the AI response server-side against the schema.** Never trust raw
  AI values. Record extraction usage (item 11 `ExtractionUsage`).

### 5. reservas@resdrop.app — inbound email (rework `routes/inbound-email.js`)
- A user forwards a hotel confirmation to **reservas@resdrop.app**; ResDrop reads
  it, extracts booking info, and creates an **import awaiting review** (NOT an
  active booking — change the current direct-create behavior).
- Use the existing mailbox via **IMAP (read) + SMTP (send)** — free libs
  **ImapFlow, Mailparser, Nodemailer**. Do not add a paid email service or change
  the stack. (Resend is already available for outbound if SMTP is not configured;
  support both, preferring SMTP env when set.)
- Env (add to `server/.env.example`; real values go in Railway → Variables):
  ```
  INBOUND_EMAIL_ENABLED=false
  INBOUND_EMAIL_ADDRESS=reservas@resdrop.app
  IMAP_HOST=            IMAP_PORT=993   IMAP_SECURE=true
  IMAP_USER=            IMAP_PASSWORD=
  SMTP_HOST=            SMTP_PORT=      SMTP_SECURE=
  SMTP_USER=            SMTP_PASSWORD=
  APP_BASE_URL=
  INBOUND_EMAIL_POLL_MINUTES=2
  INBOUND_IMPORT_TOKEN_EXPIRY_HOURS=72
  ```
- Never commit credentials; never expose them to the browser.

### 6. Inbound workflow (hook into `server/scheduler.js`, not a paid service)
1. Connect securely to the mailbox (IMAP). 2. Read only unprocessed messages.
3. Save `Message-ID` + mailbox `UID`. 4. Identify envelope sender. 5. Validate
attachments/MIME. 6. Extract email text. 7. Extract PDF/image attachments.
8. Deterministic parse + OCR. 9. Limited AI only if needed (item 4). 10. Create a
**draft `BookingImport`**. 11. Send the user a **secure review link**. 12. Mark/
move the email only **after** successful processing (DB transaction committed).
- Statuses: `RECEIVED, PROCESSING, NEEDS_REVIEW, READY_FOR_CONFIRMATION,
  CONFIRMED, FAILED, DUPLICATE`.
- **Idempotent — reprocessing the same email must not create another booking.**
  Deduplicate by: Message-ID, mailbox UID, attachment hash, booking reference,
  and hotel+dates when appropriate.
- Gate the whole poller behind `INBOUND_EMAIL_ENABLED` (default false) so nothing
  runs until configured. Run it from the existing scheduler on
  `INBOUND_EMAIL_POLL_MINUTES` cadence (or a Hostinger/Railway cron hitting an
  admin-authenticated trigger endpoint).

### 7. Registered users
- Normalize + match the verified sender against the ResDrop account DB
  (`db.getUser`). If registered: create the draft import associated to that
  account, send a confirmation reply with a **secure review link**, and **do not
  activate monitoring** until essential fields are complete AND the user confirms.
- Reply copy (use account language when known):
  - PT — Subject `Recebemos sua reserva`; body: greeting + "Recebemos sua
    confirmação de hotel e começamos a preparar o monitoramento. Revise os dados
    extraídos e complete qualquer informação necessária pelo link abaixo:
    [REVIEW LINK]. O monitoramento será iniciado após a sua confirmação. ResDrop".
  - EN — Subject `We received your booking`; equivalent English (see spec).

### 8. Users without an account
- Create a **pending email import** (not linked to any user). Generate a **secure
  single-use, hashed, expiring registration token** (`PendingImportToken`). Send
  a reply with an account-creation link. On registration + email verification,
  attach the pending import to the new account and drop the user directly into the
  **Review Details** step.
- Reply copy:
  - PT — Subject `Crie sua conta para acompanhar sua reserva` (see spec body).
  - EN — Subject `Create your account to monitor your booking` (see spec body).
- **Do not expose booking info in the signup URL.** Store only an opaque, hashed,
  expiring token; the URL carries the token, nothing else.

### 9. Email security
- MIME allowlist; file-size limits; attachment-count limits; filename
  sanitization; HTML sanitization; block executables; path-traversal protection;
  **SPF/DKIM/DMARC** result checks when headers are present; secure token hashing
  (e.g. sha256, compare hashes); token expiration; single-use tokens; per-sender
  rate limits (reuse the `rateLimit` helper concept); audit logs; sanitized error
  logs. Do **not** trust any account/user ID written in the email body — use the
  **verified sender** only. Never send confidential booking info to a different
  unverified address. Do not mark an email processed until the DB transaction
  commits.

### 10. Missing information
- When essential info is missing: still create a draft import with status
  `NEEDS_REVIEW`; highlight missing essential fields in **red** on the review page;
  include the missing-field info; send the review link; **do not activate
  monitoring**. User can complete fields manually. Examples: missing check-out,
  hotel, check-in, total, or currency.

### 11. Database (add via `run-migration.js` inline pattern; adapt to existing tables)
Add these concepts (don't duplicate users/subscriptions/bookings):
- **InboundEmail**: `id, message_id, mailbox_uid, sender_email, subject,
  received_at, processed_at, status, failure_reason, content_hash`.
- **BookingImport**: `id, user_id (nullable), inbound_email_id (nullable),
  upload_id (nullable), source, extracted_data (jsonb), confidence_data (jsonb),
  missing_fields (jsonb), status, confirmed_at`.
- **PendingImportToken**: `id, booking_import_id, email, token_hash, expires_at,
  used_at`.
- **ExtractionUsage**: `id, source, deterministic_success, ocr_used, ai_used,
  input_token_estimate, output_tokens, cached, created_at`.
Use idempotent `CREATE TABLE IF NOT EXISTS` + indexes on the dedup keys
(`message_id`, `content_hash`, `token_hash`, `booking_import_id`).

---

## TESTING (Node built-in runner, `server/*.test.js`; mocks/fixtures only)

Add tests covering:
- **Upload/extraction**: deterministic-first; AI not called when unnecessary;
  identical content hits cache; strict JSON validation; a failed AI response does
  not corrupt the import; missing check-out surfaces as an essential/red error;
  confirm blocked when essential fields missing; invalid file rejected; duplicate
  file handled.
- **Inbound email** (mock IMAP/parser): registered vs unregistered sender; secure
  signup link generated; expired token rejected; used token rejected; duplicate
  Message-ID / duplicate attachment → no duplicate booking; PDF and image
  confirmations; missing required fields → NEEDS_REVIEW; invalid attachment
  rejected; retry/idempotency (reprocess = no new booking); IMAP disconnect and
  SMTP failure handled; **no active monitoring before user confirmation**.
- Follow the **injectable-dependency** pattern from `server/priceIndex.js` so DB
  and provider calls are mocked (no live DB, no real mailbox, no real AI creds).

**Never connect tests to the production mailbox or real AI/API keys.**

---

## EXECUTION & DELIVERABLE

1. Inspect only relevant files. 2. ≤5-item plan. 3. Implement, reusing the files
above. 4. Add migrations to `run-migration.js` (inline pattern). 5. Add tests.
6. Run `npm run build` (root), `cd server && npm test`, and eslint on changed
files; fix all failures you introduced. 7. Commit with **explicit paths** and the
vercel.json swap dance above; push to `main`.

Final report (concise): what changed; files modified; migrations; env vars; how
to configure `reservas@resdrop.app` on Hostinger (IMAP/SMTP host/port/creds) +
required DNS (MX, SPF, DKIM, DMARC); cron command + recommended frequency
(`INBOUND_EMAIL_POLL_MINUTES`, default 2); test + build results; any manual
DNS/IMAP/SMTP step still required; unresolved limitations.

**Done when:** screenshot/paste/drag upload opens a working Review step; missing
required data is clearly highlighted in red; `reservas@resdrop.app` processes
confirmations into draft imports; registered users get a review link; new users
get a secure signup link; duplicate emails never create duplicate bookings; AI is
used only when necessary (cached by hash); monitoring never starts before user
confirmation; existing design/functionality intact; build + tests pass.

---

## NOTES FROM THE PRIOR ENGINEER (me)
- The Nuitée integration already added: `server/liteApi.js` (hardened client),
  `server/priceIndex.js` (cost-capped Price Index — **study its injectable-store
  pattern**, reuse it for testability), `server/nuiteeRoutes.js`,
  `server/hotelMapping.js`, and migrations in `run-migration.js`. When a booking
  import is confirmed, you can optionally call `mapReservation(...)` to attach a
  `nuitee_hotel_id` — but that's optional here.
- `DocumentUpload.jsx` already renders a `doc-review` block — grow it into the
  full review step rather than starting a new component.
- If unsure whether a table applied, remember: the backend reads via Postgres
  (`db.js`), not REST — the app sees migration-created tables even if the Supabase
  REST schema cache lags.
