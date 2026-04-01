import { expect, test, vi } from "vitest";
import { apiRequest } from "@/lib/api";

test("backend reachable", async () => {
  global.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ status: "ok" }),
    text: async () => "ok",
  })) as typeof fetch;

  const res = await apiRequest<{ status: string }>("/health");
  expect(res.status).toBe("ok");
});
