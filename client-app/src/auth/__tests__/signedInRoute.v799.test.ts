// BF_CLIENT_v799_SIGNED_IN_ROUTE
// A signed-in client goes to their application on the server, even when this device has no
// memory of it (new device, reinstall, application made elsewhere); local memory is the fallback.
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveSignedInRoute } from "../signedInRoute";

const token = (phone: string) => "x." + btoa(JSON.stringify({ phone, exp: Math.floor(Date.now() / 1000) + 3600 })) + ".y";

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe("where a signed-in client lands", () => {
  it("opens the application the server has for this phone", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ found: true, application: { id: "app-123" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await resolveSignedInRoute(token("+15875550100"))).toBe("/application/app-123");
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain("/api/client/applications/by-phone");
  });

  it("starts the application when the server has none and the device has no memory", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ found: false }), { status: 200 })));
    expect(await resolveSignedInRoute(token("+15875550101"))).toBe("/apply/step-1");
  });

  it("falls back to this device's memory when the server can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    expect(await resolveSignedInRoute(token("+15875550102"))).toBe("/apply/step-1");
  });
});
