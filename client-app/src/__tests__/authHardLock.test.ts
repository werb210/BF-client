import { beforeEach, describe, expect, it, vi } from "vitest"
import { bootstrapSession } from "@/app/bootstrap"
import { apiRequest, setToken } from "@/lib/api"
import { getTokenOrFail } from "@/services/token"

describe("auth hard lock", () => {
  beforeEach(() => {
    setToken(null)
  })

  it("bootstrap does not gate auth", async () => {
    await expect(bootstrapSession()).resolves.toBeNull()
  })

  it.each(["", "undefined", "null"])("invalid stored token '%s' is blocked", (token) => {
    setToken(token)
    expect(() => getTokenOrFail()).toThrow("[AUTH BLOCK]")
  })

  it("api request uses forced auth headers", async () => {
    setToken("valid-token")
    const fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await expect(
      apiRequest("/api/health", {
        headers: { Authorization: "Bearer attacker" },
      }),
    ).resolves.toEqual({ ok: true })

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
          "X-Request-Id": expect.any(String),
        }),
      }),
    )
  })

  it("api 401 clears token and throws unauthorized", async () => {
    setToken("valid-token")
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("unauthorized", { status: 401 }))

    await expect(apiRequest("/api/health")).rejects.toThrow("INVALID_TOKEN")
  })

  it("invalid path injection is blocked", async () => {
    setToken("valid-token")
    await expect(apiRequest("/api//health")).rejects.toThrow("MALFORMED_PATH")
  })

  it("rejects private endpoint without token", async () => {
    await expect(apiRequest("/api/private/test")).rejects.toThrow("AUTH_REQUIRED")
  })

  it("times out slow requests", async () => {
    setToken("valid-token")
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((handler: TimerHandler) => {
      if (typeof handler === "function") {
        handler()
      }
      return 0 as unknown as ReturnType<typeof setTimeout>
    }) as typeof setTimeout)
    vi.spyOn(window, "fetch").mockImplementation((_input, init) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new Error("aborted"))
          return
        }
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true })
      }) as Promise<Response>
    })

    await expect(apiRequest("/api/slow")).rejects.toThrow()
  })
})
