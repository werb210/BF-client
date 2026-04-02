import { afterEach, beforeEach, vi } from "vitest";
import { TextDecoder, TextEncoder } from "util";

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

const installBrowserLikeGlobals = () => {
  if (typeof (global as any).window === "undefined") {
    (global as any).window = global;
  }

  if (typeof (global as any).document === "undefined") {
    (global as any).document = {
      createElement: () => ({
        style: {},
        appendChild: () => {},
        removeChild: () => {},
        setAttribute: () => {},
        removeAttribute: () => {},
        cloneNode: () => null,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    };
  }

  if (typeof (global as any).navigator === "undefined") {
    (global as any).navigator = {
      userAgent: "node",
    };
  }

  (global as any).localStorage = localStorageMock;
  (global as any).sessionStorage = sessionStorageMock;

  (global as any).fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: "ok",
      data: {},
    }),
  }));
};

installBrowserLikeGlobals();

beforeEach(() => {
  installBrowserLikeGlobals();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  if (typeof localStorage?.clear === "function") localStorage.clear();
  if (typeof sessionStorage?.clear === "function") sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as any).ResizeObserver = ResizeObserverMock;
window.scrollTo = vi.fn();
(globalThis as any).TextEncoder = TextEncoder;
(globalThis as any).TextDecoder = TextDecoder;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
