import { purgeSensitiveFromStorage, toStorableJson } from "./sensitiveFields";

export const OFFLINE_CACHE_KEY = "boreal_app_cache";
const KEY = OFFLINE_CACHE_KEY;

type OfflineData = Record<string, unknown>;

// BF_CLIENT — storage-safe mirror. Blocked localStorage (private mode, in-app
// browsers, ITP / storage partitioning) silently no-ops setItem and returns
// null on getItem. Without an in-memory copy, the app token written on step 1
// is gone by step 2, the session guard sees no applicationToken, and the user
// is bounced back to step 1 — the OTP login loop. Mirror to memory so the
// session survives a blocked store for the life of the page.
// BF_CLIENT_v789_SENSITIVE_FIELDS - storage gets the copy without SIN/SSN, date
// of birth, home address or personal figures; the application store keeps the
// full copy in memory.
let memory: OfflineData | null = null;

// Data written by a build from before v789 can still hold those fields.
function purgeStored(): void {
  try {
    purgeSensitiveFromStorage(localStorage, KEY);
  } catch {
    /* storage blocked */
  }
}

export const OfflineStore = {
  save(data: object) {
    memory = { ...data };
    try {
      localStorage.setItem(KEY, toStorableJson(data));
    } catch {
      /* kept in memory for this session */
    }
  },
  load(): OfflineData | null {
    purgeStored();
    try {
      const raw = localStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") return parsed as OfflineData;
    } catch {
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    }
    return memory;
  },
  clear() {
    memory = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};
