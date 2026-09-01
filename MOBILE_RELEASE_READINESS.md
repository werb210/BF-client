# Mobile release readiness

Statuses are deliberately limited to **READY**, **NEEDS CREDENTIALS**, and **NEEDS MANUAL STORE SETUP**.

## iOS

| Item | Status | Evidence / remaining action |
|---|---|---|
| Bundle ID | READY | Xcode uses `com.boreal.client`. |
| Version/build number | READY | Project has initial marketing/build values; increment for each upload. |
| Signing | NEEDS CREDENTIALS | Select the production Apple team and provisioning profile. |
| Privacy manifest | READY | `PrivacyInfo.xcprivacy` is packaged and declares only framework UserDefaults access reason CA92.1; re-audit after dependency changes. |
| Usage strings | READY | Camera, photos and microphone (advisor calls) have product-specific descriptions. |
| APNs | NEEDS CREDENTIALS | Push callbacks exist; add capability and production APNs key. |
| Icons | READY | Existing Boreal AppIcon asset catalog is retained. |
| Launch screen | READY | Existing Boreal splash catalog/storyboard is retained. |
| TestFlight | NEEDS MANUAL STORE SETUP | Archive and create TestFlight groups/build review. |
| App Privacy | NEEDS MANUAL STORE SETUP | Complete disclosures from actual production data practices. |
| Screenshots | NEEDS MANUAL STORE SETUP | Capture approved device-size store screenshots. |
| Privacy-policy URL | NEEDS MANUAL STORE SETUP | Confirm the production public URL in App Store Connect. |
| Support URL | NEEDS MANUAL STORE SETUP | Confirm the production support URL in App Store Connect. |

## Android

| Item | Status | Evidence / remaining action |
|---|---|---|
| Application ID | READY | Gradle uses `com.boreal.client`. |
| versionCode/versionName | READY | Initial values are present; increment for each release. |
| targetSdk 36 | READY | compileSdk and targetSdk are both 36. |
| Release signing | NEEDS CREDENTIALS | Generate/store the production upload key outside Git. |
| FCM | NEEDS CREDENTIALS | Add the real Firebase project and uncommitted `google-services.json`. |
| Icons | READY | Adaptive, round and density-specific Boreal assets are packaged; verify Play preview before submission. |
| Data Safety | NEEDS MANUAL STORE SETUP | Complete from actual production collection/sharing behavior. |
| Privacy policy | NEEDS MANUAL STORE SETUP | Confirm production policy URL in Play Console. |
| Signed AAB | NEEDS CREDENTIALS | Build after release signing is configured. |
| Internal testing | NEEDS MANUAL STORE SETUP | Create track and invite testers in Play Console. |
| Screenshots/store listing | NEEDS MANUAL STORE SETUP | Capture approved screenshots and complete copy. |
