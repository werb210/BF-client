// BF_CLIENT_EXPIRED_SIGNIN_v1
import { describe, expect, it, vi } from "vitest";
import { handleBootSignedOut } from "../expiredSession";

const deps = (over: Partial<Parameters<typeof handleBootSignedOut>[1]> = {}) => ({
  hasToken: () => true, clearToken: vi.fn(), path: "/portal", redirect: vi.fn(), ...over,
});

describe("an expired sign-in on the client portal", () => {
  it("drops the token and sends the client to sign in", () => {
    const d = deps();
    expect(handleBootSignedOut({ ok: false, reason: "signed_out" }, d)).toBe(true);
    expect(d.clearToken).toHaveBeenCalled();
    expect(d.redirect).toHaveBeenCalledWith("/otp");
  });
  it("does nothing when the session is fine, the network failed, or there is no token", () => {
    for (const [r, over] of [[{ ok: true }, {}], [{ ok: false, reason: "network" }, {}], [{ ok: false, reason: "signed_out" }, { hasToken: () => false }]] as const) {
      const d = deps(over as any);
      expect(handleBootSignedOut(r as any, d)).toBe(false);
      expect(d.redirect).not.toHaveBeenCalled();
    }
  });
  it("leaves the application wizard alone", () => {
    const d = deps({ path: "/apply/step-3" });
    expect(handleBootSignedOut({ ok: false, reason: "signed_out" }, d)).toBe(false);
  });
});
