import { afterEach, describe, expect, it, vi } from "vitest";

describe("api", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns response data on successful contract envelope", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.com");
    vi.resetModules();

    const response = { status: "ok", data: { value: 123 } };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => response,
    } as Response);

    expect(response.status).toBe("ok");
    expect(response).toHaveProperty("data");

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
      json: async () => ({ status: "error", error: { message: "boom" } }),
    } as Response);

    const { api } = await import("../lib/api");

    await expect(api("/maya/chat", { method: "POST" })).rejects.toThrow("boom");
  });

  it("rejects when response cannot be parsed as json", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.com");
    vi.resetModules();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
    } as Response);

    const { api } = await import("../lib/api");

    await expect(api("/maya/chat", { method: "POST" })).rejects.toThrow("INVALID_JSON_RESPONSE");
  });
});
