// BF_CLIENT_PGI_FEE_DISCLOSURE_v1
import { describe, expect, it } from "vitest";
import { buildSubmissionPayload, pgiConsentComplete, PGI_FEE_DISCLOSURE } from "../submission";

describe("PGI fee disclosure and consent", () => {
  it("only blocks when PGI is requested without both boxes", () => {
    expect(pgiConsentComplete({})).toBe(true);
    expect(pgiConsentComplete({ pgiOptIn: "no" })).toBe(true);
    expect(pgiConsentComplete({ pgiOptIn: "yes" })).toBe(false);
    expect(pgiConsentComplete({ pgiOptIn: "yes", pgiFeeAck: true })).toBe(false);
    expect(pgiConsentComplete({ pgiOptIn: "yes", pgiFeeAck: true, pgiConsentShare: true })).toBe(true);
  });
  it("disclosure says Boreal may be paid and is not a broker", () => {
    expect(PGI_FEE_DISCLOSURE).toMatch(/may receive a fee from PGI Canada Ltd\./);
    expect(PGI_FEE_DISCLOSURE).toMatch(/not an insurance broker/);
  });
  it("sends the consent and wording only when PGI is requested", () => {
    const base: any = { business: {}, applicant: {}, documents: {}, selectedProductId: "p" };
    const yes: any = buildSubmissionPayload({ ...base, pgiOptIn: "yes", pgiFeeAck: true, pgiConsentShare: true });
    expect(yes.pgi_consent_share).toBe(true);
    expect(yes.pgi_fee_disclosure_ack).toBe(true);
    expect(yes.pgi_fee_disclosure_text).toBe(PGI_FEE_DISCLOSURE);
    const no: any = buildSubmissionPayload({ ...base, pgiOptIn: "no" });
    expect(no.pgi_consent_share).toBeUndefined();
  });
});
