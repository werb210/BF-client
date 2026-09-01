import { Capacitor, registerPlugin } from "@capacitor/core";

const KEY = "bf_jwt_token";
interface SecureCredentialsPlugin {
  get(): Promise<{ value: string | null }>;
  set(options: { value: string }): Promise<void>;
  clear(): Promise<void>;
}
const SecureCredentials = registerPlugin<SecureCredentialsPlugin>("SecureCredentials");

function browserStorage(): Storage | undefined {
  try { return typeof window === "undefined" ? undefined : window.localStorage; } catch { return undefined; }
}

export const credentialStore = {
  async get(): Promise<string | null> {
    if (Capacitor.isNativePlatform()) return (await SecureCredentials.get()).value;
    try { return browserStorage()?.getItem(KEY) ?? null; } catch { return null; }
  },
  async set(value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) await SecureCredentials.set({ value });
    else try { browserStorage()?.setItem(KEY, value); } catch { /* preserve in-memory token */ }
  },
  async clear(): Promise<void> {
    if (Capacitor.isNativePlatform()) await SecureCredentials.clear();
    else try { browserStorage()?.removeItem(KEY); } catch { /* storage may be blocked */ }
  },
};
