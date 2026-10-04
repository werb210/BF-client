// BF_CLIENT_FEE_REASON_v724
import { describe, it, expect } from "vitest";
import { feeReasonText } from "../FeeAgreementSignModal";

describe("fee agreement window explains a failure", () => {
  it("turns server reasons into plain words", () => {
    expect(feeReasonText("signer_email_missing")).toBe("we don't have an email address for the person signing");
    expect(feeReasonText("session_failed: SignNow 400 invalid signer")).toBe("SignNow 400 invalid signer");
  });
});
