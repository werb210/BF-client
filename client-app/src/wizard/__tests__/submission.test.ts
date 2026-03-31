import { describe, expect, it, vi } from "vitest";
import { ClientProfileStore } from "../../state/clientProfiles";
import {
  assertSubmissionReadiness,
  buildSubmissionPayload,
  canSubmitApplication,
  getPostSubmitRedirect,
  getMissingRequiredDocs,
  shouldBlockForMissingDocuments,
} from "../submission";
import type { ApplicationData } from "../../types/application";

vi.mock("../../state/clientProfiles", () => ({
  ClientProfileStore: {
    hasPortalSession: vi.fn(),
  },
}));

describe("submission payload", () => {
  const baseApp: ApplicationData = {
    kyc: { fundingAmount: 4000 },
    productCategory: "Working Capital",
    matchPercentages: {},
    eligibleProducts: [],
    eligibleCategories: [],
    eligibilityReasons: [],
    business: { legalName: "Acme Co" },
    applicant: { fullName: "Taylor Doe" },
    documents: {
      bank_statements: {
        name: "bank.pdf",
        base64: "abc123",
        category: "bank_statements",
        productId: "prod-1",
        status: "uploaded",
      },
    },
    productRequirements: {
      "prod-1": [
        { id: "req-1", document_type: "bank_statements", required: true },
      ],
    },
    documentsDeferred: false,
    selectedProduct: {
      id: "prod-1",
      name: "Starter Loan",
      product_type: "Loan",
      lender_id: "lender-a",
    },
    selectedProductId: "prod-1",
    selectedProductType: "Loan",
    requires_closing_cost_funding: false,
    termsAccepted: true,
    typedSignature: "Taylor Doe",
    signatureDate: "2024-10-04",
    applicationToken: "token-123",
    applicationId: "app-123",
    currentStep: 6,
    readinessLeadId: "lead-123",
  };

  it("includes lender product id, application data, and document metadata", () => {
    const payload = buildSubmissionPayload(baseApp);
    expect(payload.lender_product_id).toBe("prod-1");
    expect(payload.business_info).toEqual({ legalName: "Acme Co" });
    expect(payload.documents).toEqual([
      {
        document_type: "bank_statements",
        name: "bank.pdf",
        category: "bank_statements",
        product_id: "prod-1",
        status: "uploaded",
      },
    ]);
  });

  it("includes readinessLeadId in submission payload", () => {
    const payload = buildSubmissionPayload(baseApp);
    expect(payload.application.readiness_lead_id).toBe("lead-123");
    expect(payload.kyc_answers).toEqual({ fundingAmount: 4000 });
    expect(payload.product_category).toBe("Working Capital");
    expect(payload.applicant_info).toEqual({ fullName: "Taylor Doe" });
    expect(payload.signature).toEqual({
      terms_accepted: true,
      typed_signature: "Taylor Doe",
      co_applicant_signature: undefined,
      signature_date: "2024-10-04",
    });
  });

  it("detects missing required documents", () => {
    const missing = getMissingRequiredDocs({
      ...baseApp,
      documents: {},
    });
    expect(missing.map((entry) => entry.document_type)).toEqual([
      "bank_statements",
    ]);
  });

  it("allows skipping documents when deferred", () => {
    const shouldBlock = shouldBlockForMissingDocuments({
      ...baseApp,
      documents: {},
      documentsDeferred: true,
    });
    expect(shouldBlock).toBe(false);
  });

  it("redirects submitted applicants to the portal by default", () => {
    vi.mocked(ClientProfileStore.hasPortalSession).mockReturnValue(false);
    expect(getPostSubmitRedirect({ token: "token-123" })).toBe("/portal");
  });

  it("prefers the application portal when available", () => {
    expect(
      getPostSubmitRedirect({ token: "token-123", applicationId: "app-123" })
    ).toBe("/application/app-123");
  });

  it("disables submission when offline or missing idempotency", () => {
    expect(
      canSubmitApplication({
        isOnline: false,
        hasIdempotencyKey: true,
        hasApplicationToken: true,
        hasSelectedProductId: true,
        termsAccepted: true,
        typedSignature: true,
        partnerSignature: true,
        missingIdDocs: 0,
        missingRequiredDocs: 0,
        docsAccepted: true,
        ocrComplete: true,
        creditSummaryComplete: true,
        documentsDeferred: false,
      })
    ).toBe(false);

    expect(
      canSubmitApplication({
        isOnline: true,
        hasIdempotencyKey: false,
        hasApplicationToken: true,
        hasSelectedProductId: true,
        termsAccepted: true,
        typedSignature: true,
        partnerSignature: true,
        missingIdDocs: 0,
        missingRequiredDocs: 0,
        docsAccepted: true,
        ocrComplete: true,
        creditSummaryComplete: true,
        documentsDeferred: false,
      })
    ).toBe(false);
  });

  it("blocks submission if required data missing", () => {
    expect(() =>
      assertSubmissionReadiness({
        ...baseApp,
        selectedProductId: undefined,
      } as ApplicationData)
    ).toThrow("PRODUCT_REQUIRED");

    expect(() =>
      assertSubmissionReadiness({
        ...baseApp,
        documents: {},
        documentsDeferred: false,
      } as ApplicationData)
    ).toThrow("DOCUMENTS_REQUIRED");
  });
});
