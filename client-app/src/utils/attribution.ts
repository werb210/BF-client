// ---- Attribution Persistence ----

export const ATTR_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "msclkid",
  "ga_client_id",
] as const;

type AttrKey = (typeof ATTR_KEYS)[number];

export type PersistedAttribution = Record<AttrKey, string | null>;

export const persistAttributionFromUrl = () => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);

  ATTR_KEYS.forEach((key) => {
    const value = url.searchParams.get(key);
    if (value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* BF_CLIENT_BLOCK_v865_STORAGE_SAFE — localStorage blocked; non-essential */
      }
    }
  });
};

export const getPersistedAttribution = (): PersistedAttribution => {
  const attribution = {} as PersistedAttribution;

  // BF_CLIENT_BLOCK_v865_STORAGE_SAFE — never throw when localStorage is
  // blocked; attribution is non-essential and must not break the submit path.
  ATTR_KEYS.forEach((key) => {
    try {
      attribution[key] = localStorage.getItem(key);
    } catch {
      attribution[key] = null;
    }
  });

  return attribution;
};

