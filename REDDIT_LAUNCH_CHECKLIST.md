# ResDrop — Reddit Launch Go/No-Go Checklist

## Must complete before posting (blockers)
- [ ] `INBOUND_WEBHOOK_SECRET` set on Railway **or** inbound email left off
      (webhook now rejects with 503 when unset — safe either way).
- [ ] Stripe: 12 Prices created + `STRIPE_PRICE_*` + `STRIPE_WEBHOOK_SECRET` set,
      Stripe webhook endpoint added. Verify `/api/config` → `"stripeEnabled":true`.
- [ ] `MONITOR_DAILY_BUDGET` set to match expected active bookings **and** your
      SerpApi plan (see `docs/MONITORING.md`). Default 100/day is low for 300 users.
- [ ] Rotate any secret shown in chat/screenshots (VAPID pair).
- [ ] Confirm `CORS_ORIGIN` = `https://resdrop.app` in production.
- [ ] Deploy the reviewed commit; `curl -s https://resdrop.app/api/config` looks right.
- [ ] Smoke test: signup → add booking → open detail (images load) → upgrade →
      Stripe checkout → back to app.

## Strongly recommended before posting
- [ ] Add a `Content-Security-Policy` header (finding #4).
- [ ] Rate-limit the public endpoints `/api/hotels/search`, `/api/awin/*`,
      `/api/expedia/*` (finding #5).
- [ ] Confirm Supabase automatic backups are on.
- [ ] Sanitize the Nuitée HTML rendered via `dangerouslySetInnerHTML` (finding #3).
- [ ] Have a paid Resend plan ready (free tier = 3k emails/mo).

## Safe to complete after the initial beta
- [ ] Per-user inbound email alias (finding #2), then enable email forwarding.
- [ ] Magic-byte file-signature validation on uploads (finding #6).
- [ ] Major dependency upgrades that need `npm audit fix --force` (test first).
- [ ] SSRF deep-dive, RLS second layer, attachment retention policy.

## Manual production checks (not verifiable from repo)
- [ ] Supabase RLS reviewed; storage buckets private; backups + restore tested.
- [ ] Railway env has no dev defaults; secrets differ from local.
- [ ] Vercel: production build, no exposed source maps, HTTPS enforced.

## Monitoring during the first 24h
- [ ] Watch Railway logs for `[Inbound Webhook] Refusing`, 401/403 spikes,
      `[Monitor]` cost, Stripe webhook errors.
- [ ] Watch SerpApi + Resend usage dashboards for cost spikes.
- [ ] Watch signup rate for bot floods.

## Emergency rollback / kill switches
- [ ] Pause monitoring: set `MONITOR_ENABLED=false` (redeploy).
- [ ] Disable inbound email: unset `INBOUND_WEBHOOK_SECRET` (endpoint 503s) or
      remove the CF route.
- [ ] Roll back: `git revert <bad commit>` + push (Railway/Vercel auto-deploy),
      or redeploy the previous green commit.
- [ ] Throttle abuse: lower rate-limit maxes; lower `MONITOR_DAILY_BUDGET`.
