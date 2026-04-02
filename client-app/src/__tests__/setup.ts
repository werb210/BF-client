import { beforeEach, vi } from "vitest";

const localStore = new Map<string, string>();
const sessionStore = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => localStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    localStore.set(key, value);
  },
  removeItem: (key: string) => {
    localStore.delete(key);
  },
  clear: () => {
    localStore.clear();
  },
};

const sessionStorageMock = {
  getItem: (key: string) => sessionStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    sessionStore.set(key, value);
  },
  removeItem: (key: string) => {
    sessionStore.delete(key);
  },
  clear: () => {
    sessionStore.clear();
  },
};

if (typeof globalThis.window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    writable: true,
    configurable: true,
  });
}

if (typeof globalThis.navigator === "undefined") {
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "node" },
    writable: true,
    configurable: true,
  });
}

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

if (typeof globalThis.fetch === "undefined") {
  Object.defineProperty(globalThis, "fetch", {
    value: vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ status: "ok", data: {} }),
    })),
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
