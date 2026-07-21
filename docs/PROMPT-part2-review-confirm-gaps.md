# ResDrop — Part 2: Close the email review→confirm loop (gaps audit)

> The first implementation (items 3–11) is largely done and deployed: IMAP inbound
> poller gated by `INBOUND_EMAIL_ENABLED`, `gpt-4o-mini` extraction (temp 0, strict
> JSON schema, content-hash cache), draft `booking_imports`, hashed
> `pending_import_tokens`, dedup, 130 passing tests. **Do not rebuild any of that.**
> This prompt closes the remaining gaps so the email flow works end-to-end. Read
> the "Verified state" and "Gaps" sections; implement only the gaps.

## Ground rules (same as before)
- React+Vite (`src/`) + Express (`server/`) + Supabase Postgres (`db.js` →
  `import { supabase as sql } from './db.js'`).
- **Deploy = `git push origin main`** (NOT `vercel deploy`). Migrations auto-apply
  on Railway boot via `server/run-migration.js` (inline `await sql\`CREATE TABLE IF
  NOT EXISTS…\``). No DDL via Supabase REST.
- Commit with explicit paths; before committing do the vercel.json swap
  (`git show HEAD:vercel.json > vercel.json`, commit, then restore working copy).
- Tests: `cd server && npm test` (`node --test`). Build: `npm run build`.
- **Monitoring must never start except through an explicit user confirmation.**
- Reuse existing code; add translations (PT default, EN preserved).

## Verified state (already correct — don't touch)
- `server/routes/documents.js`: `POST /api/bookings/from-document` (extract only,
  no booking) and `POST /api/documents/:id/create-booking` (explicit confirm →
  `createBooking` status `monitoring`, with essential-field validation + dup
  check). Upload flow is complete.
- `src/components/DocumentUpload.jsx`: two-step upload→review with essential-field
  red validation (hotel/check-in/check-out/price/currency) and confirm-blocking.
- `server/routes/inbound-email.js`: IMAP poller (gated by
  `INBOUND_EMAIL_ENABLED`), extracts, creates `booking_imports` (draft), sends
  review/signup emails, dedup by `content_hash`, hashed tokens.
- `server/aiParser.js`: `gpt-4o-mini`, `temperature:0`, `response_format`
  json_schema `strict:true`, `max_tokens` low, sha256 content-hash cache.
- Migrations present: `inbound_emails`, `booking_imports`, `pending_import_tokens`,
  `extraction_usage`. `db.js` has `createBookingImport`, `getBookingImport`,
  `getPendingImportTokenByHash`, `createExtractionUsage`.
- Emails build: review link `${APP_BASE_URL}/dashboard?reviewImport=<importId>`
  (registered users) and signup link `${APP_BASE_URL}/signup?token=<rawToken>`
  (new users). Only `GET /api/inbound/pending-import?token=` (unauth) exists to read
  a draft by token.

## GAPS to close (implement exactly these)

### G1 — Backend: confirm an import into a monitored booking (the missing link)
Add, in `server/routes/inbound-email.js` (or a small new route module mounted the
same way):
- **`GET /api/inbound/imports/:id`** (authMiddleware): return the draft
  `booking_import` for the logged-in owner. 403 if `user_email` ≠ `req.userEmail`.
  Used by the registered-user review link.
- **`POST /api/inbound/imports/:id/confirm`** (authMiddleware): body = the
  reviewed/edited fields. Server-side: re-validate essential fields (hotel name,
  check-in, check-out, total price, currency) → 400 with the field list if any
  missing; run the same duplicate check as `documents.js` (hotel+dates); on
  success `db.createBooking({ ...fields, email: req.userEmail, status:'monitoring',
  … })`, set the import `status='CONFIRMED'`, `confirmed_at=now()`, and if it came
  from a token mark that token `used_at=now()`. **Idempotent**: if the import is
  already `CONFIRMED`, return the existing booking id, do not create a second
  booking.
- **`POST /api/inbound/pending-import/confirm`** (unauth, token-based) for the
  new-user path *after* they registered+verified: accepts `{ token, fields }`,
  validates the token (see G4), attaches the import to the now-existing account
  (`user_id`/`user_email`), then performs the same confirm→createBooking as above
  and marks the token used. (Alternatively require the user to be logged in after
  signup and reuse G1's authed confirm — pick one and keep it consistent.)

### G2 — Frontend: surface & handle the review link
- Handle `?reviewImport=<id>` on `/dashboard` (in `DashboardPage`/`Dashboard`): on
  mount, if the param is present, fetch `GET /api/inbound/imports/:id` and open a
  review UI. **Reuse `DocumentUpload`'s review step** (extract a shared
  `ImportReview` component or pass the import data into the existing review markup)
  — same red/essential validation and confirm-blocking. On Confirm call
  `POST /api/inbound/imports/:id/confirm`; on success show the new booking and
  clear the query param.
- Do **not** create a whole new page system; a modal/section on the dashboard or a
  small `/review/:id` route reusing the existing review markup is enough.

### G3 — Frontend: new-user signup → attach → review
- `src/components/Signup.jsx`: read `?token=`. If present, call
  `GET /api/inbound/pending-import?token=` to validate and show "we found your
  forwarded booking" context (email pre-filled from the token response). After
  successful registration **and email verification**, attach the pending import to
  the new account and route the user straight into the review step (G2), then
  confirm via the token-based or authed confirm (G1). Never put booking data in the
  URL — only the opaque token.

### G4 — Token hardening (verify + fix)
- `getPendingImportTokenByHash` (and every token read) MUST enforce
  `expires_at > now()` AND `used_at IS NULL`. If it doesn't, fix it. Confirm marks
  `used_at` so tokens are single-use. Expired/used → 404/410 with a friendly,
  translated message. Keep per-sender rate limiting and audit logging on the
  inbound poller (add if missing).

### G5 — Safety re-check (must remain true)
- The IMAP poller must ONLY call `createBookingImport` (draft) — never
  `createBooking`. Confirm it still does. Active monitoring starts exclusively via
  G1's confirm endpoints, after explicit user action.

## Tests to add (`server/*.test.js`, mocks only)
- Confirm endpoint: creates a monitored booking from a valid import; rejects when
  an essential field is missing; is **idempotent** (second confirm returns the same
  booking, no duplicate); marks import CONFIRMED and token used.
- Fetch-by-id: 403 for a non-owner.
- Token: expired token rejected; already-used token rejected; single-use enforced
  (confirm sets `used_at`).
- Attach-on-signup: pending import becomes linked to the new account and is
  confirmable.
- Safety: poller path never calls `createBooking`.
Frontend (if a test setup exists; otherwise manual note): review link loads the
import; red validation on missing essential; confirm blocked until complete;
confirm creates the booking.

## Done when
`git push`-deployed; `npm test` + `npm run build` pass; a forwarded email to
`reservas@resdrop.app` (with `INBOUND_EMAIL_ENABLED=true`) creates a draft, the
review link opens a working review with red validation, Confirm creates a monitored
booking, new users get a signup link that attaches the import after registration,
tokens are single-use and expiring, duplicates never double-book, and monitoring
never starts before confirmation.

## Final report
List: files changed, new endpoints, any migration/column added, env still needed,
Hostinger IMAP/SMTP + DNS (MX/SPF/DKIM/DMARC) steps still required, test/build
results, and any remaining limitation.
