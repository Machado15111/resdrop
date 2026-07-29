# ResDrop — Data Handling & Privacy Notes

**Not legal advice.** Implementation notes to align with LGPD/GDPR; flag items
needing legal review.

## Personal-data inventory
| Data | Why | Stored | Third parties |
|------|-----|--------|---------------|
| Email, name, phone, password hash | account | Supabase `users` | Resend (email) |
| Hotel name, dates, room, guest name, confirmation #, price | monitoring | Supabase `bookings` | SerpApi, Nuitée (hotel name/city sent for matching) |
| Forwarded email content + attachments | extraction | parsed in-memory; inbound metadata in `inbound_emails`/`booking_imports` | Cloudflare (email routing) |
| Stripe customer/subscription | billing | **Stripe only** (email in metadata; no card data on our servers) | Stripe |
| Push subscription | notifications | Supabase `push_subscriptions` | browser push service |

## Retention (recommendations — implement)
- Raw forwarded email bodies: don't persist full body; keep metadata only. Purge
  `inbound_emails`/`booking_imports` drafts after ~90 days.
- Attachments: parsed in-memory (not persisted to a bucket by default). If a
  bucket is added, private + signed URLs + ≤90-day retention.
- Logs: set a retention window (≤30–90 days).
- Deleted bookings/users: hard-delete cascade (`ON DELETE CASCADE` in schema).

## Access & logging rules
- Admins: allow-listed emails (`ADMIN_EMAILS`), all admin mutations logged via
  `db.logActivity`.
- Logs must never contain: passwords, tokens, reset/guest tokens, API keys, full
  auth headers, raw payment data, entire forwarded emails, full confirmations.
- Analytics/error-monitoring: none wired yet — when added, redact PII.

## Open questions for legal review
- Privacy policy + terms wording (pages exist at `/privacy`, `/terms` — review copy).
- Consent language for email/attachment processing and monitoring.
- Data-export + account-deletion self-service (deletion via API exists; export
  is JSON/CSV export route — confirm completeness).
- Sub-processor disclosure list (Supabase, Railway, Vercel, Resend, Cloudflare,
  Stripe, SerpApi, Nuitée).
