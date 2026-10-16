// BF_CLIENT_v817 - where the client downloads the Boreal Financial app. Used by the mini-portal install card
// and the Settings "Get the app" row; both are hidden inside the native app itself.
export const ANDROID_PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.boreal.client";

// No numeric App Store id is published yet. Once the listing is live, set VITE_IOS_APP_STORE_URL
// (e.g. https://apps.apple.com/app/id1234567890) in the Static Web App build; until then the App Store search.
export const IOS_APP_STORE_FALLBACK_URL = "https://apps.apple.com/ca/search?term=Boreal%20Financial";

export function iosAppStoreUrl(env: Record<string, unknown> | undefined = readEnv()): string {
  const raw = typeof env?.VITE_IOS_APP_STORE_URL === "string" ? env.VITE_IOS_APP_STORE_URL.trim() : "";
  if (/^\d{6,12}$/.test(raw)) return `https://apps.apple.com/app/id${raw}`; // a bare App Store id
  if (/^https:\/\/(apps|itunes)\.apple\.com\//i.test(raw)) return raw;
  return IOS_APP_STORE_FALLBACK_URL;
}

function readEnv(): Record<string, unknown> | undefined {
  try {
    return (import.meta as unknown as { env?: Record<string, unknown> }).env;
  } catch {
    return undefined;
  }
}
