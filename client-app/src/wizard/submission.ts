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
  // BF_CLIENT_BLOCK_v163_PGI_OPT_IN_PAYLOAD_v1
  // "yes" if the applicant ticked Add PGI in Step 6; "no" if they
  // explicitly declined; omitted if they didn't choose either way.
  // BF-Server reads this on /submit to fire the BI handoff.
  pgi_opt_in?: "yes" | "no";
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
    .filter((entry) => entry.required && entry.stage === 1)
    // BF_CLIENT_BLOCK_v713_SUBMIT_GATE_NO_CMP_FORMS_v1 — CMP forms (net worth,
    // banking/Flinks, CRA, debt, real estate, equipment, advisors) are collected
    // post-submit in the mini-portal and must never block submit, even if a
    // product mis-stages one as Stage 1. Mirrors BF-Server FORM_BY_KEYWORD.
    .filter((entry) => !/net worth|flinks|banking connection|connect bank|\bcra\b|debt|real estate|equipment|professional advisor|\badvisor/i.test(String(entry.document_type ?? "")))
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
      // BF_CLIENT_BLOCK_v92_FULL_WIZARD_FINALIZE_v1
      looking_for: (app.kyc as any)?.lookingFor,
      capital_amount: (app.kyc as any)?.capitalAmount ?? (app.kyc as any)?.fundingAmount,
      equipment_amount: (app.kyc as any)?.equipmentAmount,
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
    // BF_CLIENT_BLOCK_v163_PGI_OPT_IN_PAYLOAD_v1 — propagate Step 6 choice.
    pgi_opt_in: app.pgiOptIn,
  };
}

export function assertSubmissionReady(app: ApplicationData) {
  if (!app) {
    throw new Error("APPLICATION_INCOMPLETE");
  }

  // BF_CLIENT_BLOCK_v871_SUBMIT_UNBLOCK
  // A missing lender product (or deferred/absent documents) must NOT block
  // submission. Step 5's doc-union sets selectedProductId="aggregated" but never
  // sets the selectedProduct object, so the old PRODUCT_REQUIRED check threw and
  // dead-ended applicants on the false "we've got your application" screen with
  // nothing sent. The real lender match and document collection happen staff-side
  // after the application lands; the client product is only preliminary. We let
  // every complete-enough application reach the server. (canSubmitApplication
  // still requires terms + signature + a clear docs pathway, so this removes only
  // the product/doc DEAD-END, not basic validation.)
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
  // BF_CLIENT_BLOCK_v82_SUBMIT_GATE_RELAX
  // docsPathwayClear is true when:
  //   (a) the user explicitly deferred docs, OR
  //   (b) all required docs are uploaded (any status except "rejected").
  // Server-side workers (OCR, banking, credit summary) and staff
  // acceptance happen post-submit and are not gates here.
  const docsPathwayClear =
    documentsDeferred ||
    (missingRequiredDocs === 0 && docsAccepted);

  return (
    isOnline &&
    hasIdempotencyKey &&
    hasApplicationToken &&
    hasSelectedProductId &&
    termsAccepted &&
    typedSignature &&
    partnerSignature &&
    missingIdDocs === 0 &&
    docsPathwayClear
  );
}


export const assertSubmissionReadiness = assertSubmissionReady
