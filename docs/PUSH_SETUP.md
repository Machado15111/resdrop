# Web Push — enabling price-drop notifications

The code is fully wired. Push stays **off** until two one-time human steps are
done (it's a no-op meanwhile — nothing breaks). After both, the toggle appears
in Account → Notifications and a push fires on every confirmed price drop.

## Step 1 — Create the Supabase table (source of truth)
Supabase is authoritative and its schema can't be changed from app code. In the
**Supabase SQL editor**, run:

```sql
create table if not exists push_subscriptions (
  endpoint   text primary key,
  email      text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);
create index if not exists idx_push_email on push_subscriptions(email);
```

(The same table is auto-created in the mirror DB by `run-migration.js`, but the
Supabase one must be created here.)

## Step 2 — Generate VAPID keys and set Railway env vars
On your machine:

```bash
npx web-push generate-vapid-keys
```

It prints a **Public Key** and a **Private Key**. In the Railway backend service
→ Variables, set:

```
VAPID_PUBLIC_KEY=<the public key>
VAPID_PRIVATE_KEY=<the private key>
VAPID_SUBJECT=mailto:info@resdrop.app
```

Redeploy. Verify with:

```bash
curl -s https://resdrop.app/api/config
```

You should see `"pushEnabled": true` and a `vapidPublicKey`. The private key is
never exposed — only the public key is, which is required for browsers to
subscribe.

## How it works
- Account → Notifications shows an **Enable** button (only when `pushEnabled`).
- Enabling asks for the browser's notification permission and stores the
  subscription against the user's email.
- On a confirmed price drop, `applyBestResult` calls `sendPushToUser`, which
  pushes to every device the user subscribed and prunes dead subscriptions.
- Works on Android/desktop Chrome and installed iOS PWAs (iOS 16.4+). For native
  push inside a Capacitor build, add `@capacitor/push-notifications` later
  (see MOBILE_SETUP.md).
