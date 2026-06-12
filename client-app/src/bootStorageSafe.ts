// BF_CLIENT_BLOCK_v867_STORAGE_SHIM
// Some browsers make Web Storage throw on access: Safari cross-site tracking
// prevention, private mode, corporate policy, partitioned/embedded contexts.
// This runs once at boot, before render. If a storage area is unavailable it is
// replaced in this tab with an in-memory polyfill so direct Web Storage call
// sites degrade gracefully. Working browsers are left untouched.

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
};

export function makeMemoryStorage(): StorageLike {
  const mem = new Map<string, string>();

  return {
    getItem: (key) => (mem.has(String(key)) ? (mem.get(String(key)) as string) : null),
    setItem: (key, value) => {
      mem.set(String(key), String(value));
    },
    removeItem: (key) => {
      mem.delete(String(key));
    },
    clear: () => {
      mem.clear();
    },
    key: (index) => Array.from(mem.keys())[index] ?? null,
    get length() {
      return mem.size;
    },
  };
}

function isUsable(getArea: () => StorageLike | undefined): boolean {
  try {
    const area = getArea();
    if (!area) return false;

    const probe = "__bf_storage_probe__";
    area.setItem(probe, "1");
    area.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function ensureSafe(
  name: "localStorage" | "sessionStorage",
  target: any = typeof window !== "undefined" ? window : undefined,
): void {
  if (!target) return;
  if (isUsable(() => target[name])) return;

  const polyfill = makeMemoryStorage();
  try {
    Object.defineProperty(target, name, { configurable: true, get: () => polyfill });
  } catch {
    // If the host refuses redefinition, there is no safe in-page fallback left.
  }
}

ensureSafe("localStorage");
ensureSafe("sessionStorage");
