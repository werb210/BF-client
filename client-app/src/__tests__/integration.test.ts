import { expect, test, vi } from "vitest";
import { apiRequest } from "@/lib/api";
import { getEnv } from "@/config/env";

const hasApiUrl = (() => {
  try {
    getEnv();
    return true;
  } catch {
    return false;
  }
})();

test.skipIf(!hasApiUrl)("backend reachable", async () => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok", data: {} }),
      text: async () => "ok",
    } as Response)
  ) as typeof fetch;

  const res = await apiRequest<Record<string, unknown>>("/health");
  expect(res).toEqual({});
});
