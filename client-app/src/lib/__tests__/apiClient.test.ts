import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";

describe("lib/apiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed response for ok responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "ok" }),
    } as Response);

    await expect(apiFetch("/applications")).resolves.toEqual({ id: "ok" });
  });

  it("throws for non-ok responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(apiFetch("/applications")).rejects.toThrow("API error: 500");
  });
});
