# ResDrop Agent System — Index

**Before using any agent:** Read `CEREBRO.md` to load full product context.

---

## Quick Reference

| # | Agent | Use When | Time to Run |
|---|---|---|---|
| 01 | Special Fares Operator | A new Special Fare case needs client communication, offer drafting, or status updates | 5–10 min |
| 02 | Smart Alert Composer | Writing or improving a price alert email before sending | 3–5 min |
| 03 | Booking Intake Agent | A forwarded email or document upload has extracted fields that need review or user clarification | 3–5 min |
| 04 | Customer Success Agent | Writing activation, onboarding, lifecycle, or milestone emails | 5–8 min |
| 05 | User Support Agent | A user message needs a precise, helpful response | 3–5 min |
| 06 | Retention & Growth Agent | Re-engaging dormant users, writing upgrade prompts, or drafting win-back sequences | 5–8 min |
| 07 | Admin Intelligence Agent | Generating weekly ops briefs, spotting anomalies, or creating internal summaries | 5–10 min |

---

## Scenario-to-Agent Map

| Scenario | Agent to Use |
|---|---|
| New special fare case — need to contact client | 01 |
| Special fare offer ready — need to write the offer email | 01 |
| Client accepted a special fare — need booking confirmation message | 01 |
| Price drop detected — need to write the alert email | 02 |
| Alert email feels too generic or flat — need to improve it | 02 |
| No improvement found for a booking — need status update message | 02 |
| User forwarded confirmation email — extraction has low confidence fields | 03 |
| User uploaded PDF — need clarification email for missing fields | 03 |
| Booking entered via form — need intake confirmation message | 03 |
| New user just signed up — need Day 1 welcome follow-up | 04 |
| User received first alert — need celebration / guidance message | 04 |
| Stay is 14 days away — need check-in approach summary | 04 |
| Stay completed — need post-stay follow-up | 04 |
| User hit free plan booking limit — need upgrade nudge | 04 |
| User doesn't understand why an alert showed a different room | 05 |
| User says the rate ResDrop found is non-refundable | 05 |
| User asks why monitoring hasn't found anything in weeks | 05 |
| User wants to confirm savings but doesn't know how | 05 |
| User is confused about how to rebook | 05 |
| User hasn't logged in for 14+ days | 06 |
| User dismissed 3 consecutive alerts without acting | 06 |
| User's bookings all expired with no confirmed savings | 06 |
| User confirmed savings — opportunity to ask for referral | 06 |
| End of week — need ops summary for admin | 07 |
| Bookings stuck in `needs_review` for 7+ days | 07 |
| Price checks returning no results for specific hotel repeatedly | 07 |
| Need to write a product update email to all users | 07 |
| Need monthly business summary report | 07 |

---

## File Structure

```
agents/
├── CEREBRO.md                      ← Read this first. Always.
├── 00-index.md                     ← This file
├── 01-special-fares-operator.md
├── 02-smart-alert-composer.md
├── 03-booking-intake-agent.md
├── 04-customer-success-agent.md
├── 05-user-support-agent.md
├── 06-retention-growth-agent.md
└── 07-admin-intelligence-agent.md
```

---

## How to Use an Agent

1. Open `CEREBRO.md` and read sections relevant to your task
2. Open the agent file for your scenario
3. Read the **QUANDO USAR** section to confirm it's the right agent
4. Copy the **PROMPT DE ATIVAÇÃO** block
5. Paste it into a new Claude conversation
6. Fill in the `[DESCREVA AQUI]` or input fields with your specific case details
7. Review the output against the **FORMATO DE RESPOSTA IDEAL** template
8. Edit before sending — agents draft, humans approve

---

## Quality Check Before Sending Any Output

Before sending any email, message, or document produced by an agent, verify:

- [ ] Does it avoid "save", "savings", "cheaper", "deal", "discount"?
- [ ] Does it accurately describe what ResDrop found (equivalent option, same hotel, refundable)?
- [ ] Does it make clear the user decides whether to act?
- [ ] Does it avoid any implication that ResDrop rebooked automatically?
- [ ] Is it free of em dashes?
- [ ] Is the tone calm and precise — not excited, not alarmist?
- [ ] Is there exactly one primary action or CTA?
- [ ] Would this email embarrass a premium brand if forwarded?
