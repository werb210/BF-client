# bf-client — Native app build checklist
Web app is a working PWA today. Below = the real App Store / Play Store apps.

## State
- Capacitor: core/cli/ios/android 8.4.0; plugins app 8.1.0, preferences 8.0.1.
- NOTE: android/ and ios/ live at the REPO ROOT and were generated for v6 —
  regenerate on v8 (below). Resolve the root-vs-client-app location then.

## Mac only (no paid account)
1. Xcode + CocoaPods + Android Studio; Node 20+.
2. `npm ci` (root) then `npm run build`.
3. Add 1024 icon-only.png + 2732 splash.png to client-app/assets/, then
   `cd client-app && npm run assets:generate`.
4. `cd client-app && npx cap add ios && npx cap add android` (or `npx cap sync`).
5. `npm run cap:open:ios` / `cap:open:android`.

## Apple Developer ($99/yr)
- Register bundle id com.boreal.client; signing/provisioning; APNs key if push.
- Xcode archive -> App Store Connect -> TestFlight -> review.

## Google Play Console ($25 one-time)
- Create app; generate/keep signing keystore; build signed AAB; listing -> review.
- Android can ship before the Apple account is sorted.
