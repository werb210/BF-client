# bf-client — Native app build checklist

The web app is a fully working PWA today (add-to-home-screen). The Capacitor
wrappers below are for the real App Store / Play Store apps.

## State
- Capacitor aligned to 8.4.0 (matches BF-portal).
- NOTE: the `android/` and `ios/` folders are at the REPO ROOT and were generated
  for Capacitor v6. On a dev machine, regenerate them on v8 (see below).

## Blocked on a Mac only (no paid account needed)
1. Install Xcode + CocoaPods + Android Studio; Node 20+.
2. `npm ci` (repo root) then `npm run build` (produces client-app/dist).
3. Add a 1024 `icon-only.png` + 2732 `splash.png` to client-app/assets/,
   then `cd client-app && npm run assets:generate`.
4. Regenerate native projects on v8:
   `cd client-app && npx cap add ios && npx cap add android` (or `npx cap sync`).
   Resolve the root-vs-client-app native folder location at this step.
5. `npm run cap:open:ios` / `cap:open:android` to open the native IDEs.

## Blocked on Apple Developer account ($99/yr)
- Register bundle id `com.boreal.client`.
- Signing & provisioning profile; enable Push (APNs key) if notifications wanted.
- Xcode: archive -> upload to App Store Connect -> TestFlight -> review.

## Blocked on Google Play Console ($25 one-time)
- Create app; generate/upload a signing keystore (keep it safe).
- Build signed AAB; complete Play listing -> internal testing -> review.
