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

## 4. App store checklist
- App icons/splash: generate from `public/logo-mark.png` (512×512) with
  `@capacitor/assets` (`npx capacitor-assets generate`).
- Privacy policy URL: https://resdrop.app/privacy (already live).
- Apple: a paid Apple Developer account; Android: a Play Console account.
- Screenshots: capture the phone layout (booking detail, dashboard, alerts).
