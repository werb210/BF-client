import { beforeEach, describe, expect, it, vi } from "vitest"
import { bootstrapSession } from "@/app/bootstrap"
import { apiRequest } from "@/lib/api"
import { getTokenOrFail } from "@/services/token"

describe("auth hard lock", () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    vi.mocked(window.localStorage.getItem).mockImplementation((key: string) => storage.get(key) ?? null)
    vi.mocked(window.localStorage.setItem).mockImplementation((key: string, value: string) => {
      storage.set(key, value)
    })
    vi.mocked(window.localStorage.removeItem).mockImplementation((key: string) => {
      storage.delete(key)
    })
    vi.mocked(window.localStorage.clear).mockImplementation(() => {
      storage.clear()
    })

    window.localStorage.clear()
  })

  it("bootstrap does not gate auth", async () => {
    await expect(bootstrapSession()).resolves.toBeNull()
  })

  it.each(["", "undefined", "null"])("invalid stored token '%s' is blocked", (token) => {
    window.localStorage.setItem("token", token)
    expect(() => getTokenOrFail()).toThrow("[AUTH BLOCK]")
  })

  it("api request uses forced auth headers", async () => {
    window.localStorage.setItem("token", "valid-token")
    const fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await expect(
      apiRequest("/api/health", {
        headers: { Authorization: "Bearer attacker" },
      })
    ).resolves.toEqual({ ok: true })

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
      })
    )
  })

  it("credentials injection is ignored", async () => {
    window.localStorage.setItem("token", "valid-token")
    const fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await apiRequest("/api/health", {
      credentials: "include",
    })

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect(init.credentials).toBeUndefined()
  })

  it("api 401 clears token and hard redirects", async () => {
    window.localStorage.setItem("token", "valid-token")
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("unauthorized", { status: 401 }))

    await expect(apiRequest("/api/health")).rejects.toThrow("Not implemented: navigation")
    expect(window.localStorage.getItem("token")).toBeNull()
  })

  it("invalid path injection is blocked", async () => {
    window.localStorage.setItem("token", "valid-token")
    await expect(apiRequest("/api/health?x=1")).rejects.toThrow("[INVALID PATH]")
  })
})
