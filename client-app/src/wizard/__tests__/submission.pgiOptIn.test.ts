// BF_CLIENT_BLOCK_v163_PGI_OPT_IN_PAYLOAD_v1
import { describe, it, expect } from "vitest";
import { buildSubmissionPayload } from "../submission";
import type { ApplicationData } from "../../types/application";

function baseApp(): ApplicationData {
  return {
    kyc: {},
    productCategory: null,
    matchPercentages: {},
    eligibleProducts: [],
    eligibleCategories: [],
    eligibilityReasons: [],
    business: {},
    applicant: {},
    documents: { "bank-stmt": { name: "bank.pdf", base64: "", category: "bank" } },
    selectedProduct: { id: "p1", name: "X", product_type: "loan", lender_id: "L1" },
    selectedProductId: "p1",
    termsAccepted: true,
  } as unknown as ApplicationData;
}

describe("BF_CLIENT_BLOCK_v163_PGI_OPT_IN_PAYLOAD_v1", () => {
  it("includes pgi_opt_in='yes' when applicant opted in", () => {
    const app = { ...baseApp(), pgiOptIn: "yes" as const };
    const payload = buildSubmissionPayload(app);
    expect(payload.pgi_opt_in).toBe("yes");
  });

  it("includes pgi_opt_in='no' when applicant declined", () => {
    const app = { ...baseApp(), pgiOptIn: "no" as const };
    const payload = buildSubmissionPayload(app);
    expect(payload.pgi_opt_in).toBe("no");
  });

  it("omits pgi_opt_in when the applicant made no choice", () => {
    const payload = buildSubmissionPayload(baseApp());
    expect(payload.pgi_opt_in).toBeUndefined();
  });
});
