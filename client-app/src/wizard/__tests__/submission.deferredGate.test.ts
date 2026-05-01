// BF_CLIENT_BLOCK_1_25_SUBMIT_GATE_AND_STEP_DEEPLINK
import { describe, it, expect } from "vitest";
import { canSubmitApplication } from "../submission";

const baseValid = {
  isOnline: true,
  hasIdempotencyKey: true,
  hasApplicationToken: true,
  hasSelectedProductId: true,
  termsAccepted: true,
  typedSignature: true,
  partnerSignature: true,
  missingIdDocs: 0,
  missingRequiredDocs: 0,
  docsAccepted: false,
  ocrComplete: false,
  creditSummaryComplete: false,
  documentsDeferred: false,
};

describe("BF_CLIENT_BLOCK_1_25_SUBMIT_GATE_AND_STEP_DEEPLINK", () => {
  it("blocks submit when docs are NOT deferred and processing flags are false", () => {
    expect(canSubmitApplication(baseValid)).toBe(false);
  });

  it("allows submit when docs are deferred regardless of processing flags", () => {
    expect(canSubmitApplication({ ...baseValid, documentsDeferred: true })).toBe(true);
  });

  it("allows submit on the docs-uploaded path when all processing complete", () => {
    expect(canSubmitApplication({
      ...baseValid,
      documentsDeferred: false,
      docsAccepted: true,
      ocrComplete: true,
      creditSummaryComplete: true,
    })).toBe(true);
  });

  it("still blocks if missing required docs when not deferred", () => {
    expect(canSubmitApplication({
      ...baseValid,
      documentsDeferred: false,
      missingRequiredDocs: 2,
      docsAccepted: true,
      ocrComplete: true,
      creditSummaryComplete: true,
    })).toBe(false);
  });

  it("still blocks if any signature missing", () => {
    expect(canSubmitApplication({
      ...baseValid,
      documentsDeferred: true,
      typedSignature: false,
    })).toBe(false);
  });
});
