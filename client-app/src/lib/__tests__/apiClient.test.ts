import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";

describe("lib/api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns data for status=ok responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      status: 200,
      json: async () => ({ status: "ok", data: { id: "ok" } }),
    } as Response);

    await expect(api("/applications")).resolves.toEqual({ id: "ok" });
  });

  it("throws for status=error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      status: 500,
      json: async () => ({ status: "error", error: "boom" }),
    } as Response);

    await expect(api("/applications")).rejects.toThrow("boom");
  });
});
