// @ts-nocheck
import { filterRequirementsByAmount, type LenderProductRequirement } from "./requirements";
import type { ApplicationData } from "../types/application";
import { ClientProfileStore } from "../state/clientProfiles";

export type SubmissionDocument = {
  document_type: string;
  name: string;
  category?: string;
  product_id?: string;
  status?: "uploaded" | "accepted" | "rejected";
};

export type SubmissionPayload = {
  kyc_answers: ApplicationData["kyc"];
  product_category: ApplicationData["productCategory"];
  business_info: ApplicationData["business"];
  applicant_info: ApplicationData["applicant"];
  documents: SubmissionDocument[];
  signature: {
    terms_accepted: ApplicationData["termsAccepted"];
    typed_signature?: ApplicationData["typedSignature"];
    co_applicant_signature?: ApplicationData["coApplicantSignature"];
    signature_date?: ApplicationData["signatureDate"];
  };
  application: {
    product_category: ApplicationData["productCategory"];
    selected_product: ApplicationData["selectedProduct"];
    selected_product_type: ApplicationData["selectedProductType"];
    requires_closing_cost_funding?: ApplicationData["requires_closing_cost_funding"];
    terms_accepted: ApplicationData["termsAccepted"];
    typed_signature?: ApplicationData["typedSignature"];
    co_applicant_signature?: ApplicationData["coApplicantSignature"];
    signature_date?: ApplicationData["signatureDate"];
    application_token?: ApplicationData["applicationToken"];
    continuation_token?: ApplicationData["continuationToken"];
    session_token?: ApplicationData["readinessSessionToken"] | ApplicationData["continuationToken"];
    readiness_lead_id?: ApplicationData["readinessLeadId"];
  };
  lender_product_id: string;
};

export function getMissingRequiredDocs(app: ApplicationData) {
  const requirementsKey =
    app.productRequirements?.aggregated
      ? "aggregated"
      : app.selectedProductId;
  if (!requirementsKey) return [];
  const requirements =
    (app.productRequirements?.[requirementsKey] || []) as LenderProductRequirement[];
  const filtered = filterRequirementsByAmount(requirements, app.kyc?.fundingAmount);
  return filtered
    .filter((entry) => entry.required)
    .filter((entry) => !app.documents[entry.document_type]);
}

export function shouldBlockForMissingDocuments(app: ApplicationData) {
  if (app.documentsDeferred) return false;
  return getMissingRequiredDocs(app).length > 0;
}

export function buildSubmissionPayload(app: ApplicationData): SubmissionPayload {
  assertSubmissionReady(app);
  const documents = Object.entries(app.documents || {}).map(
    ([document_type, document]) => ({
      document_type,
      name: document.name,
      category: document.category,
      product_id: document.productId,
      status: document.status,
    })
  );

  return {
    kyc_answers: app.kyc,
    product_category: app.productCategory,
    business_info: app.business,
    applicant_info: app.applicant,
    documents,
    signature: {
      terms_accepted: app.termsAccepted,
      typed_signature: app.typedSignature,
      co_applicant_signature: app.coApplicantSignature,
      signature_date: app.signatureDate,
    },
    application: {
      product_category: app.productCategory,
      selected_product: app.selectedProduct,
      selected_product_type: app.selectedProductType,
      requires_closing_cost_funding: app.requires_closing_cost_funding,
      terms_accepted: app.termsAccepted,
      typed_signature: app.typedSignature,
      co_applicant_signature: app.coApplicantSignature,
      signature_date: app.signatureDate,
      application_token: app.applicationToken,
      continuation_token: app.continuationToken,
      session_token: app.readinessSessionToken || app.continuationToken,
      readiness_lead_id: app.readinessLeadId,
    },
    lender_product_id: app.selectedProductId,
  };
}

export function assertSubmissionReady(app: ApplicationData) {
  if (!app) {
    throw new Error("APPLICATION_INCOMPLETE");
  }

  if (!app.selectedProductId || !app.selectedProduct) {
    throw new Error("PRODUCT_REQUIRED");
  }

  if (!app.documentsDeferred && Object.keys(app.documents || {}).length === 0) {
    throw new Error("DOCUMENTS_REQUIRED");
  }
}

export function getPostSubmitRedirect({
  token,
  applicationId,
}: {
  token?: string;
  applicationId?: string | null;
}) {
  if (applicationId) {
    return `/application/${applicationId}`;
  }
  if (token && ClientProfileStore.hasPortalSession(token)) {
    return `/status?token=${token}`;
  }
  return "/portal";
}

export function canSubmitApplication({
  isOnline,
  hasIdempotencyKey,
  hasApplicationToken,
  hasSelectedProductId,
  termsAccepted,
  typedSignature,
  partnerSignature,
  missingIdDocs,
  missingRequiredDocs,
  docsAccepted,
  ocrComplete,
  creditSummaryComplete,
  documentsDeferred,
}: {
  isOnline: boolean;
  hasIdempotencyKey: boolean;
  hasApplicationToken: boolean;
  hasSelectedProductId: boolean;
  termsAccepted: boolean;
  typedSignature: boolean;
  partnerSignature: boolean;
  missingIdDocs: number;
  missingRequiredDocs: number;
  docsAccepted: boolean;
  ocrComplete: boolean;
  creditSummaryComplete: boolean;
  documentsDeferred: boolean;
}) {
  return (
    isOnline &&
    hasIdempotencyKey &&
    hasApplicationToken &&
    hasSelectedProductId &&
    termsAccepted &&
    typedSignature &&
    partnerSignature &&
    missingIdDocs === 0 &&
    (documentsDeferred || missingRequiredDocs === 0) &&
    docsAccepted &&
    ocrComplete &&
    creditSummaryComplete
  );
}


export const assertSubmissionReadiness = assertSubmissionReady
