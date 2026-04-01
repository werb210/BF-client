import { afterEach, describe, expect, it, vi } from "vitest";

describe("api", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns response data on successful contract envelope", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.com");
    vi.resetModules();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok", data: { value: 123 } }),
    } as Response);

    const { api } = await import("../lib/api");
    const data = await api<{ value: number }>("/maya/chat", { method: "POST" });

    expect(data).toEqual({ value: 123 });
  });

  it("throws API contract error when status is error", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.com");
    vi.resetModules();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "error", error: "boom" }),
    } as Response);

    const { api } = await import("../lib/api");

    await expect(api("/maya/chat", { method: "POST" })).rejects.toThrow("boom");
  });
});
