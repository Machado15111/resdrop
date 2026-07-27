# Automated price monitoring

Automated 24/7 monitoring is **ON by default**. Every cycle loads bookings fresh
from the DB, checks the ones that are *due*, searches in each booking's own
currency, and — on a confirmed drop — fires the email + Web Push alerts. It is
bounded so it never blows the SerpApi quota.

## What it actually costs
Real usage ≈ **your number of active (future) bookings × ~1 check/day**, because
each booking is checked at most once per `MONITOR_MIN_HOURS`. The daily budget is
just a safety cap for runaway growth — it rarely binds while the app is small.
Each check ≈ 1–2 SerpApi searches, so set the budget to match your SerpApi plan.

## Tuning (Railway env vars — all optional)

| Var | Default | Meaning |
|-----|---------|---------|
| `MONITOR_ENABLED` | `true` | Set `false` to pause (checks then run manually only). |
| `MONITOR_DAILY_BUDGET` | `100` | Max checks per calendar day across all bookings. |
| `MONITOR_MIN_HOURS` | `24` | Min hours between checks of the **same** booking. |
| `MONITOR_INTERVAL_MINUTES` | `120` | How often a cycle runs. |
| `MONITOR_BATCH` | `25` | Max checks in a single cycle. |
| `MONITOR_SPACING_MS` | `800` | Delay between checks within a cycle. |

To go easier on quota: raise `MONITOR_MIN_HOURS` (e.g. `48`) and/or lower
`MONITOR_DAILY_BUDGET`. To monitor more aggressively near check-in: lower
`MONITOR_MIN_HOURS`. Priority is always **soonest check-in first**, then
least-recently-checked; ended stays and confirmed/needs-review bookings are
skipped.

## Verify it's running
`GET /api/admin/scheduler` (admin) returns `running`, `dailyBudget`,
`budgetUsedToday`, `budgetRemaining`, `lastCheck`, and recent cycle history.
Railway boot log shows: `Monitoring: ON (every 120min, ≤100/day)`.
