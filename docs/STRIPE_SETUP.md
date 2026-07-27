# Stripe — turning on paid subscriptions

The code is fully wired. Until Stripe is configured the app runs unchanged: the
plan buttons fall back to the old free flag-flip. Once configured, upgrades go
through real Stripe Checkout and the webhook sets the plan.

## 1. Create the products/prices in Stripe
In the Stripe dashboard → Products, create a **recurring monthly Price** for each
plan in each currency (4 total). Charge whatever you decide — but make the
amounts match what the UI shows the user:

- Viajante — BRL and USD
- Premium — BRL and USD

Copy each Price id (`price_...`).

> Note: `server/billing.js` (`PLAN_AMOUNTS`) and the Account UI currently show
> slightly different numbers (25/100 vs 37/9, 125/36). Pick the real numbers,
> set the Stripe Prices to match, and align `billing.js` + the UI. Stripe is the
> source of truth for what's actually charged.

## 2. Set env vars on Railway
```
STRIPE_SECRET_KEY=sk_live_...            # secret
STRIPE_WEBHOOK_SECRET=whsec_...          # secret (from step 3)
STRIPE_PRICE_VIAJANTE_BRL=price_...
STRIPE_PRICE_VIAJANTE_USD=price_...
STRIPE_PRICE_PREMIUM_BRL=price_...
STRIPE_PRICE_PREMIUM_USD=price_...
# optional: PUBLIC_ORIGIN=https://resdrop.app   (used for return URLs)
```

## 3. Add the webhook in Stripe
Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://resdrop.app/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

Redeploy, then confirm: `curl -s https://resdrop.app/api/config` shows
`"stripeEnabled": true`.

## How it works
- Account → Change Plan → a paid plan calls `POST /api/billing/checkout` and
  redirects to Stripe Checkout (subscription mode). Currency follows the user's
  language (PT→BRL, EN→USD); the client never sends an amount.
- On payment, Stripe fires `checkout.session.completed`; the webhook reads the
  email+plan from metadata and sets the user's plan. No new DB columns — the
  account email is carried in the session/subscription metadata.
- "Manage subscription" and downgrading to Free open the Stripe **billing
  portal** (cancel, update card, view invoices). Cancellation fires
  `customer.subscription.deleted` → the user is moved back to Free.

## Testing before going live
Use test keys (`sk_test_...`) + a test webhook, and `4242 4242 4242 4242`. The
Stripe CLI can forward events locally: `stripe listen --forward-to
localhost:3001/api/stripe/webhook`.
