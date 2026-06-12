import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildSubmitAttemptBody, sendSubmitAttempt } from "./submitAttempt";

describe("BF_CLIENT_BLOCK_v870 — submit-attempt beacon", () => {
  it("builds a JSON body with status and identity", () => {
    const body = JSON.parse(buildSubmitAttemptBody(
      { applicationToken: "tok-1", applicant: { phone: "+1587", email: "a@b.co" }, business: { businessName: "Acme" } },
      "attempted",
    ));
    expect(body.status).toBe("attempted");
    expect(body.applicationToken).toBe("tok-1");
    expect(body.phone).toBe("+1587");
    expect(body.businessName).toBe("Acme");
  });
  it("falls back through legalName/companyName and kyc.phone", () => {
    const body = JSON.parse(buildSubmitAttemptBody(
      { business: { companyName: "CoOnly" }, kyc: { phone: "+1999" } }, "completed",
    ));
    expect(body.businessName).toBe("CoOnly");
    expect(body.phone).toBe("+1999");
    expect(body.applicationToken).toBeNull();
  });
  describe("sendSubmitAttempt", () => {
    beforeEach(() => { vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true } as any))); });
    afterEach(() => { vi.unstubAllGlobals(); });
    it("POSTs to /api/client/submit-attempts with keepalive and never throws", () => {
      expect(() => sendSubmitAttempt({ applicationToken: "t" }, "attempted")).not.toThrow();
      const f = (globalThis.fetch as any).mock.calls[0];
      expect(f[0]).toContain("/api/client/submit-attempts");
      expect(f[1].method).toBe("POST");
      expect(f[1].keepalive).toBe(true);
    });
    it("never throws even if fetch itself throws", () => {
      vi.stubGlobal("fetch", vi.fn(() => { throw new Error("network down"); }));
      expect(() => sendSubmitAttempt({ applicationToken: "t" }, "completed")).not.toThrow();
    });
  });
});
