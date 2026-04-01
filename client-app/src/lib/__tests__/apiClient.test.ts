import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/apiClient";

describe("lib/apiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns degraded marker when backend reports DB_NOT_READY", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => ({ status: "error", error: { code: "DB_NOT_READY" } }),
    } as Response);

    await expect(api("/api/test")).resolves.toEqual({ degraded: true });
  });

  it("throws for non-degraded API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => ({ status: "error", error: { code: "SOME_OTHER_ERROR" } }),
    } as Response);

    await expect(api("/api/test")).rejects.toThrow("SOME_OTHER_ERROR");
  });
});
