// BF_CLIENT_CHROME_v168
// Single source of truth for "are we inside the iOS/Android shell". Capacitor
// wraps the same web build, so anything that should not appear in the app has
// to ask. Guarded so it cannot throw during SSR, tests, or a plain web load.
import { Capacitor } from "@capacitor/core";

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
