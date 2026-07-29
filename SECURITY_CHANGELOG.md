# ResDrop — Security Changelog (pre-launch audit, 2026-07-29)

## `server/routes/inbound-email.js` — Critical fix
- **Change:** both inbound webhooks (`/inbound/webhook`, `/inbound/cloudflare-email`)
  now **fail closed** — return 503 when `INBOUND_WEBHOOK_SECRET` is unset, 401 on
  mismatch, using constant-time comparison on both routes.
- **Risk addressed:** unauthenticated booking injection into arbitrary accounts
  via `From` spoofing when the secret was unconfigured (was fail-open).
- **Behavioral effect:** inbound email now requires the secret to be set;
  otherwise it is safely rejected (no processing).
- **Tests added:** `server/inbound_webhook_auth.test.js` (503 no-secret, 401
  wrong-secret, cloudflare-email 503).
- **Deploy note:** set `INBOUND_WEBHOOK_SECRET` on Railway if using inbound email.

## `server/routes/inbound-email.js` — attachment cap
- **Change:** cap processed attachments per email to `INBOUND_MAX_ATTACHMENTS`
  (default 10).
- **Risk addressed:** parser-fan-out cost/DoS from an email with many attachments.
- **Behavioral effect:** only the first N attachments are processed.

## `package-lock.json`, `server/package-lock.json` — dependencies
- **Change:** `npm audit fix` (non-breaking) applied to both.
- **Risk addressed:** several advisories in build-time tooling + transitive deps.
- **Remaining:** advisories that only fix via major upgrades are deferred (not
  runtime-reachable / not triggered — see `SECURITY_AUDIT.md` §3 #7).
- **Behavioral effect:** none (lockfile-only; build + 226 tests still pass).

## New deliverable docs
- `SECURITY_AUDIT.md`, `REDDIT_LAUNCH_CHECKLIST.md`, `DATA_HANDLING.md`,
  `INCIDENT_RESPONSE.md`, `SECURITY_CHANGELOG.md`.

## Verification run
- `node --test` (server): **226 pass / 0 fail** (incl. 3 new webhook-auth tests).
- `npm run build`: pass. `npx eslint src`: 0 errors. `npm audit`: reviewed.
