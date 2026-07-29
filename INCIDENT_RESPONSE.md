# ResDrop — Incident Response Runbook

First move for any incident: **preserve evidence** (screenshot logs, export the
relevant Railway/Supabase/Stripe log lines) before changing anything, and avoid
pasting user data into new places.

## Exposed secret (API key, webhook secret, VAPID private, Stripe key)
1. Rotate it in the provider immediately; set the new value on Railway; redeploy.
2. Stripe key: roll in Stripe dashboard; check for unexpected charges.
3. Assume any secret ever shown in chat/screenshot/commit is compromised — rotate.

## Compromised admin account
1. Rotate that admin's password; the token cache invalidates on password change.
2. Temporarily remove the email from `ADMIN_EMAILS` and redeploy if needed.
3. Review `activity_log` for admin actions during the window.

## Abused email-ingestion endpoint / malicious attachment
1. Unset `INBOUND_WEBHOOK_SECRET` (endpoint 503s) or remove the CF route.
2. Identify affected accounts from `inbound_emails`/`booking_imports`; delete
   injected bookings. Attachments are parsed in-memory (not persisted).

## Excessive API / third-party usage (cost spike)
1. `MONITOR_ENABLED=false` to stop the scheduler; lower `MONITOR_DAILY_BUDGET`.
2. Lower rate-limit maxes in `server/index.js`; redeploy.
3. Check SerpApi/Nuitée/Resend dashboards; rotate keys if abuse used them.

## Leaked account data / wrong public access to a reservation
1. Contain: revoke sessions (rotate the affected user's token / password), and
   if a share mechanism exists, revoke/regenerate the link.
2. Assess scope from logs; notify affected users per policy.

## Revoking sessions & disabling signups
- Sessions: password change invalidates cached tokens (`authCache`).
- Signups: add a server-side feature flag / lower `signupRateLimit` (or block at
  the edge) if a bot flood hits.

## Third-party provider compromise
- Rotate that provider's key, disable the dependent feature via env, monitor.
