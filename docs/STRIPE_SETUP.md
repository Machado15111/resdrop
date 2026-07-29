# Stripe — turning on paid subscriptions

The code is fully wired. Until Stripe is configured the app runs unchanged: the
plan buttons fall back to the old free flag-flip. Once configured, upgrades go
through real Stripe Checkout and the webhook sets the plan.

## 1. Create the products/prices in Stripe
In the Stripe dashboard → Products, create **two products** (Viajante, Premium).
Under each, add **6 recurring Prices** — one per currency (BRL/USD/EUR) x period
(monthly/yearly), 12 Prices total. Amounts (must match the UI):

| Plan | BRL /mo · /yr | USD /mo · /yr | EUR /mo · /yr |
|------|---------------|---------------|---------------|
| Viajante | R$23 · R$230 | $8 · $80 | €7 · €70 |
| Premium  | R$109 · R$1090 | $25 · $250 | €23 · €230 |

(Yearly is 10x monthly = 2 months free.) Copy each Price id (`price_...`).

## 2. Set env vars on Railway
```
STRIPE_SECRET_KEY=sk_live_...            # secret (done)
STRIPE_WEBHOOK_SECRET=whsec_...          # secret (from step 3)

STRIPE_PRICE_VIAJANTE_BRL_MONTH=price_...
STRIPE_PRICE_VIAJANTE_BRL_YEAR=price_...
STRIPE_PRICE_VIAJANTE_USD_MONTH=price_...
STRIPE_PRICE_VIAJANTE_USD_YEAR=price_...
STRIPE_PRICE_VIAJANTE_EUR_MONTH=price_...
STRIPE_PRICE_VIAJANTE_EUR_YEAR=price_...
STRIPE_PRICE_PREMIUM_BRL_MONTH=price_...
STRIPE_PRICE_PREMIUM_BRL_YEAR=price_...
STRIPE_PRICE_PREMIUM_USD_MONTH=price_...
STRIPE_PRICE_PREMIUM_USD_YEAR=price_...
STRIPE_PRICE_PREMIUM_EUR_MONTH=price_...
STRIPE_PRICE_PREMIUM_EUR_YEAR=price_...
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
