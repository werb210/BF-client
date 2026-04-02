import { afterEach, vi } from "vitest";

global.fetch = vi.fn((url, options: any) => {
  if (!options?.headers?.["Authorization"]) {
    throw new Error("Missing Authorization header");
  }

  if (!options?.headers?.["x-request-id"]) {
    throw new Error("Missing request id");
  }

  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
  } as Response);
});

Object.defineProperty(global, "localStorage", {
  value: {
    getItem: () => "test-token",
    setItem: () => {},
    removeItem: () => {},
  },
});

afterEach(() => {
  vi.clearAllMocks();
});
