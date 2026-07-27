# ResDrop — Mobile (PWA + App Store / Play Store)

The web app is now a **PWA** (installable, offline shell, push-ready) and is
**Capacitor-ready** so the same build can ship to the App Store and Play Store.
Nothing here changes the website; it just adds native packaging on top.

## 1. PWA — already live (no action needed)
- `public/manifest.webmanifest`, `public/sw.js`, and the icons ship with the
  normal `git push` deploy.
- On Android/desktop Chrome users get an **Install app** prompt; on iOS Safari,
  *Share → Add to Home Screen*. It launches full-screen (standalone).

## 2. Push notifications (Web Push)
The service worker already handles `push` / `notificationclick`. To turn it on
you need VAPID keys and one env var set on Railway — see
`docs/PUSH_SETUP.md` (added with the push backend).

## 3. Native apps with Capacitor
Run these **on your Mac** (needs Xcode for iOS, Android Studio for Android):

```bash
# one-time
npm install -D @capacitor/cli
npm install @capacitor/core @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android

# each release
npm run build          # produces dist/
npx cap sync           # copies dist/ + plugins into the native projects
npx cap open ios       # opens Xcode  → Archive → upload to App Store Connect
npx cap open android   # opens Android Studio → build AAB → Play Console
```

`capacitor.config.json` is already set (`appId: app.resdrop`, `webDir: dist`).

### Native push (APNs / FCM), later
For true native push inside the wrapped app, add `@capacitor/push-notifications`
and register APNs (iOS) / FCM (Android). The Web Push path above already covers
installed-PWA users on Android and iOS 16.4+.

## 4. App icons & splash (already generated)
A clean, brand-accurate source set is committed in **`assets/`** (extracted from
the high-res logo, transparent background, no artifacts):

- `assets/icon-only.png` (1024) — iOS/legacy icon
- `assets/icon-foreground.png` + `assets/icon-background.png` — Android adaptive
- `assets/splash.png` + `assets/splash-dark.png` (2732) — launch screens

After `npx cap add ios/android`, generate every platform size with one command:

```bash
npx @capacitor/assets generate --assetPath assets
```

The PWA icons in `public/` (`icon-192/512`, `icon-maskable-512`, `apple-touch-icon`)
were regenerated from the same clean source and ship with the web deploy.

## 5. Native push (APNs / FCM), when you wrap
The installed-PWA Web Push path (docs/PUSH_SETUP.md) already covers Android and
iOS 16.4+. For push inside the wrapped native app:

```bash
npm install @capacitor/push-notifications
npx cap sync
```

Then register on the device and POST the token to the backend. You'll need an
**FCM** project (Android) and an **APNs key** (iOS) uploaded to Firebase, plus a
sender in the backend (e.g. `firebase-admin`). This is additive — the current
web-push endpoints and `sendPushToUser` stay as-is for PWA users.

## 6. App store checklist
- Privacy policy URL: https://resdrop.app/privacy (already live).
- Apple: a paid Apple Developer account; Android: a Play Console account.
- Screenshots: capture the phone layout (booking detail, dashboard, alerts).
