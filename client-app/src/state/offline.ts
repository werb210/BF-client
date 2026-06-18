const KEY = "boreal_app_cache";

// BF_CLIENT — storage-safe mirror. Blocked localStorage (private mode, in-app
// browsers, ITP / storage partitioning) silently no-ops setItem and returns
// null on getItem. Without an in-memory copy, the app token written on step 1
// is gone by step 2, the session guard sees no applicationToken, and the user
// is bounced back to step 1 — the OTP login loop. Mirror to memory so the
// session survives a blocked store for the life of the page.
let memory: unknown = null;

export const OfflineStore = {
  save(data: unknown) {
    memory = data;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* kept in memory for this session */
    }
  },
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    }
    return memory && typeof memory === "object" ? memory : null;
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
