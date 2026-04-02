function getStore(type: "local" | "session"): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return type === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export const safeStorage = {
  getLocal(key: string): string | null {
    return getStore("local")?.getItem(key) ?? null;
  },
  setLocal(key: string, value: string) {
    getStore("local")?.setItem(key, value);
  },
  removeLocal(key: string) {
    getStore("local")?.removeItem(key);
  },
  clearLocal() {
    getStore("local")?.clear();
  },
  getSession(key: string): string | null {
    return getStore("session")?.getItem(key) ?? null;
  },
  setSession(key: string, value: string) {
    getStore("session")?.setItem(key, value);
  },
  removeSession(key: string) {
    getStore("session")?.removeItem(key);
  },
  clearSession() {
    getStore("session")?.clear();
  },
};
