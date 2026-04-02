import { afterEach, describe, expect, it, vi } from "vitest";

describe("api", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns response data on successful contract envelope", async () => {
    vi.stubEnv("REACT_APP_API_URL", "https://api.example.com");
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
    vi.stubEnv("REACT_APP_API_URL", "https://api.example.com");
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
    vi.stubEnv("REACT_APP_API_URL", "https://api.example.com");
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

  it("blocks direct /api-prefixed paths to prevent contract drift", async () => {
    vi.stubEnv("REACT_APP_API_URL", "https://api.example.com");
    vi.resetModules();
    const { apiRequest } = await import("../lib/api");

    await expect(apiRequest("/api/leads")).rejects.toThrow("DIRECT_API_PATH_FORBIDDEN");
  });

  it("locks contract calls onto env API base", async () => {
    vi.stubEnv("REACT_APP_API_URL", "https://api.example.com");
    vi.resetModules();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok", data: { id: "lead_1" } }),
    } as Response);

    const { createLead } = await import("../api/leads");

    await createLead({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "555-555-0100",
      source: "test",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/leads",
      expect.objectContaining({ method: "POST" })
    );
  });
});
