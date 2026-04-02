import { afterEach, vi } from "vitest";
import { enforceApiUsage } from "@/api/guard";

process.env.VITE_API_URL = process.env.VITE_API_URL || "http://localhost:3000";

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ status: "ok", ["data"]: {} }),
  } as Response)
);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

enforceApiUsage();

process.setMaxListeners(20);

afterEach(() => {
  vi.clearAllMocks();
});

Object.defineProperty(global.navigator, "serviceWorker", {
  value: {
    register: vi.fn(),
  },
});
