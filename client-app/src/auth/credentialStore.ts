import { Capacitor, registerPlugin } from "@capacitor/core";

const KEY = "bf_jwt_token";
interface SecureCredentialsPlugin {
  get(options?: { key?: string }): Promise<{ value: string | null }>;
  set(options: { value: string; key?: string }): Promise<void>;
  clear(options?: { key?: string }): Promise<void>;
}
const SecureCredentials = registerPlugin<SecureCredentialsPlugin>("SecureCredentials");

function browserStorage(): Storage | undefined {
  try { return typeof window === "undefined" ? undefined : window.localStorage; } catch { return undefined; }
}

export const credentialStore = {
  async get(): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      try { return (await SecureCredentials.get()).value; } catch { return null; }
    }
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

// BF_CLIENT_FACE_ID_SIGN_IN_v297 - a separate secure slot for the Face ID sign-in credential.
export const namedCredentialStore = {
  async get(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      try { return (await SecureCredentials.get({ key })).value; } catch { return null; }
    }
    return null;
  },
  async set(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) await SecureCredentials.set({ key, value });
  },
  async clear(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) await SecureCredentials.clear({ key }).catch((): void => undefined);
  },
};
