import { afterEach, describe, expect, it, vi } from "vitest";

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns network_error on fetch failure without throwing", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.com");
    vi.resetModules();

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("offline"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { apiRequest } = await import("../lib/api");
    const result = await apiRequest("/maya/chat", { method: "POST", body: { message: "hi" } });

    expect(result).toEqual({ success: false, message: "network_error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("returns timeout when request exceeds timeout window", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.com");
    vi.useFakeTimers();
    vi.resetModules();

    vi.spyOn(globalThis, "fetch").mockImplementationOnce(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }) as Promise<Response>
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { apiRequest } = await import("../lib/api");
    const requestPromise = apiRequest("/maya/chat", { method: "GET" });

    await vi.advanceTimersByTimeAsync(10_000);
    const result = await requestPromise;

    expect(result).toEqual({ success: false, message: "timeout" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
