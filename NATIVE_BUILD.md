# Native build and security guide

## Current structure and versions

The canonical native projects live beside the Capacitor configuration:

```
client-app/
  capacitor.config.ts
  ios/
  android/
```

There is no root Android project. Both shells use Capacitor **8.4.x**. iOS uses SwiftPM (not CocoaPods), resolves Capacitor core exactly at 8.4.0, targets iOS 15, and uses bundle ID `com.boreal.client`. Android uses application ID `com.boreal.client`, `minSdkVersion = 24`, `compileSdkVersion = 36`, and `targetSdkVersion = 36`.

## Migrated native configuration

The former root Android project was moved intact only after reviewing its manifest, Gradle configuration, resources and Java activity. Its Boreal launcher/splash assets, package namespace, API levels and Capacitor Gradle wiring were preserved. The canonical manifest additionally disables backup and cleartext traffic, adds modern camera/notification permissions, and registers `borealclient://` without legacy storage permissions.

The existing iOS project was retained. Its icon, splash, AppDelegate URL forwarding, Info.plist permissions, privacy manifest and SwiftPM setup remain. Push registration forwarding, the custom URL scheme, a Keychain credential plugin, and an app-switcher privacy cover were added.

## Security and runtime architecture

Bearer tokens remain in local storage for browser/PWA compatibility. Native tokens are migrated once from old WebView storage and thereafter use an iOS Keychain item (`AfterFirstUnlockThisDeviceOnly`) or AES-GCM encrypted Android storage whose non-exportable key is held in Android Keystore. Preferences is not used for credentials.

Release traffic is HTTPS-only: Capacitor has no mixed-content override and Android declares `usesCleartextTraffic="false"`. No permissive ATS or Android network-security exception exists. Custom links, native URL opens and push taps share one allow-listed parser and safely fall back to `/portal`.

Push client registration and tap handling are wired, but there is no confirmed BF-Server device-token registration contract in this repository. Before enabling production push, BF-Server must expose/document an authenticated, idempotent device registration/removal contract covering platform, token rotation and logout. No placeholder endpoint or credentials are included.

Sensitive screens are covered in the iOS app switcher and by a WebView lifecycle cover. Screenshots are not globally blocked because no product requirement calls for that behavior.

## Environment and release builds

`VITE_*` values are public configuration, never secrets. `.env.development` is for local/development origins; `.env.production` is the production public API origin; local overrides must not be committed. Verify the effective production origin before every store archive. Production signing files, APNs credentials and `google-services.json` are intentionally absent.

From the repository root:

```bash
npm ci
npm run typecheck
npm run test
npm run build
cd client-app
npx cap sync android
cd android && ./gradlew assembleDebug
```

On macOS:

```bash
cd client-app
npx cap sync ios
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

## Universal/App Links remaining

Custom `borealclient://` links are the durable fallback. Once a production web domain is approved:

- iOS: add the Associated Domains entitlement and serve a valid `apple-app-site-association` file from that domain.
- Android: add an `https` intent filter with `android:autoVerify="true"`, then serve `assetlinks.json` containing the production package and signing-certificate SHA-256.

Do not add either domain association until the real domain and production signing identity are known.

## Account work remaining

### Apple account remaining
- Register `com.boreal.client`.
- Enable Push Notifications if needed.
- Create a production APNs key.
- Configure signing and provisioning.
- Archive the app.
- Distribute through TestFlight.
- Complete App Store submission.

### Google remaining
- Create the Play Console app.
- Create and securely manage a release keystore.
- Create Firebase project/config if push is enabled.
- Produce a signed AAB.
- Complete internal testing.
- Complete Data Safety disclosures.
- Complete store submission.
