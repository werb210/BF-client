// @ts-nocheck
import { memo, useCallback, useEffect, useMemo, useState } from "react";
// BF_CLIENT_BLOCK_v106_DOC_REQUIREMENTS_UNION_v1
import { fetchRequiredDocsUnion } from "../api/lenderProducts";
import { useNavigate } from "react-router-dom";
import { useApplicationStore } from "../state/useApplicationStore";
import { ClientAppAPI } from "../api/clientApp";
import { StepHeader } from "../components/StepHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { WizardLayout } from "../components/WizardLayout";
import { ProductSync } from "../lender/productSync";
import {
  formatDocumentLabel,
  sortRequirements,
  type LenderProductRequirement,
} from "./requirements";
import { filterProductsForApplicant, parseCurrencyAmount } from "./productSelection";
import { getCountryCode } from "../utils/location";
import {
  aggregateRequiredDocuments,
  ensureAlwaysRequiredDocuments,
  mergeRequirementLists,
} from "../documents/requiredDocuments";
import { extractApplicationFromStatus } from "../applications/resume";
import { FileUploadCard } from "../components/FileUploadCard";
import { Checkbox } from "../components/ui/Checkbox";
import { DocumentUploadList } from "../components/DocumentUploadList";
import { Spinner } from "../components/ui/Spinner";
import { useForegroundRefresh } from "../hooks/useForegroundRefresh";
import { components, layout, scrollToFirstError, tokens } from "@/styles";
import { trackEvent } from "../utils/analytics";
import { resolveStepGuard } from "./stepGuard";
import { track } from "../utils/track";
import { validateFile } from "@/utils/fileValidation";
import { persistApplicationStep } from "./saveStepProgress";
import { extractRequiredDocumentsFromStatus } from "../documents/requiredDocumentsFromStatus";
import { syncRequiredDocumentsFromStatus } from "../documents/requiredDocumentsCache";
import { resolveDocumentCategory } from "@/config/documentCategories";
import {
  getRejectionMessage,
  resolveDocumentStatus,
  type DocumentStatus,
} from "../documents/documentStatus";
// BF_UPLOAD_QUEUE_v51
import { enqueueUploadFromFile } from "../lib/uploadQueue";

// BF_CLIENT_BLOCK_v96_LIVE_TEST_FIXES_v1
// The hardcoded "every applicant must upload contracts/invoices/tax_returns"
// list is wrong — it's a leftover from before product-driven required_documents
// existed. Required docs now come exclusively from each matching lender
// product's required_documents array (unioned across legs in Step 5's
// aggregateRequiredDocuments call). Bank statements and photo IDs are
// added back globally by ensureAlwaysRequiredDocuments.
function getDynamicRequirementRules() {
  return [];
}

const RequirementRow = memo(function RequirementRow({
  entry,
  app,
  isUploading,
  docError,
  progress,
  onPick,
  onDrop,
  docStatus,
}) {
  const docType = entry.document_type;
  return (
    <FileUploadCard
      key={entry.id}
      title={formatDocumentLabel(docType)}
      status={isUploading ? `Uploading ${progress}%` : docStatus}
      data-error={Boolean(docError) || docStatus === "missing" || docStatus === "rejected"}
      onDragOver={(event) => event.preventDefault()}
      onDrop={async (event) => {
        event.preventDefault();
        // BF_CLIENT_WIZARD_STEP5_MULTIFILE_v60 — accept multiple
        // dropped files and upload sequentially. The server creates
        // one document row per file regardless of category, so all
        // uploads land against the same document_type. Awaiting each
        // call avoids races on the per-docType progress + uploading
        // state that handleFile mutates inside.
        const files = Array.from(event.dataTransfer.files || []);
        if (files.length === 0) {
          onDrop(docType, null);
          return;
        }
        for (const file of files) {
          await onDrop(docType, file);
        }
      }}
    >
      <input
        id={`doc-${entry.id}`}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.png,.jpg"
        style={{ display: "none" }}
        onChange={async (e: unknown) => {
          // BF_CLIENT_WIZARD_STEP5_MULTIFILE_v60 — same logic as drop.
          const files = Array.from((e.target as HTMLInputElement).files || []);
          if (files.length === 0) {
            onDrop(docType, null);
            return;
          }
          for (const file of files) {
            await onDrop(docType, file);
          }
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.xs }}>
        <label style={{ display: "flex", alignItems: "center", gap: tokens.spacing.xs }}>
          <Checkbox checked={docStatus !== "missing"} readOnly />
          <span style={{ fontWeight: 600, color: tokens.colors.primary }}>{formatDocumentLabel(docType)}</span>
        </label>
        <div style={{ ...components.form.helperText, fontSize: 12 }}>
          {entry.required ? "Required" : "Optional"} · {docStatus === "missing" ? "Missing" : "Uploaded"}
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={isUploading}
          loading={isUploading}
          onClick={() => onPick(entry.id)}
          style={{ width: "100%" }}
          aria-label={`Upload ${formatDocumentLabel(docType)}`}
        >
          {/* BF_CLIENT_WIZARD_STEP5_MULTIFILE_v60 — plural to hint
            that the picker accepts multiple files at once. */}
          Upload files
        </Button>
        {isUploading ? <div style={components.form.helperText}>Upload progress: {progress}%</div> : null}
        {app.documents[docType] && <div style={components.form.helperText}>Uploaded: {app.documents[docType].name}</div>}
        {docError && <div style={components.form.errorText}>{docError}</div>}
        {!docError && docStatus === "missing" && entry.required && <div style={components.form.errorText}>This document is required.</div>}
        {docStatus === "rejected" && <div style={components.form.errorText}>{getRejectionMessage(app.documents[docType])}</div>}
      </div>
    </FileUploadCard>
  );
});


export function Step5_Documents() {
  const { app, update } = useApplicationStore();
  const navigate = useNavigate();
  const [requirementsRaw, setRequirementsRaw] = useState<
    LenderProductRequirement[]
  >([]);
  const [docError, setDocError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const selectedCategory =
    app.productCategory ||
    app.selectedProductType ||
    app.selectedProduct?.product_type ||
    app.selectedProduct?.name ||
    "";

  const orderedRequirements = useMemo(() => {
    return sortRequirements(requirementsRaw);
  }, [requirementsRaw]);
  const requiredDocs = useMemo(
    () => orderedRequirements.filter((entry) => entry.required),
    [orderedRequirements]
  );
  const groupedRequirements = useMemo(() => {
    const groups = new Map<string, LenderProductRequirement[]>();
    requiredDocs.forEach((entry) => {
      const category = resolveDocumentCategory(entry.document_type);
      const list = groups.get(category) || [];
      list.push(entry);
      groups.set(category, list);
    });
    return Array.from(groups.entries());
  }, [requiredDocs]);

  const missingRequiredDocs = useMemo(
    () =>
      requiredDocs
        .map((entry) => entry.document_type)
        .filter((docType) => !app.documents[docType]),
    [app.documents, requiredDocs]
  );

  const hasBlockingUploadErrors = useMemo(() => {
    return requiredDocs.some((entry) => {
      const docType = entry.document_type;
      const entryStatus = app.documents[docType]?.status;
      return Boolean(docErrors[docType]) || entryStatus === "rejected";
    });
  }, [app.documents, docErrors, requiredDocs]);

  const hasUploadsInFlight = useMemo(
    () => requiredDocs.some((entry) => uploadingDocs[entry.document_type]),
    [requiredDocs, uploadingDocs]
  );

  // BF_CLIENT_BLOCK_v106_DOC_REQUIREMENTS_UNION_v1 — pull deduped union
  // of required docs from BF-Server based on borrower's Step 1+2 inputs.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await fetchRequiredDocsUnion({
          country: (app?.kyc as any)?.country || (app?.kyc as any)?.businessLocation,
          product_category: (app?.productCategory as string | undefined) || (app?.kyc as any)?.lookingFor,
          funding_amount: Number((app?.kyc as any)?.fundingAmount || 0) || undefined,
          industry: (app?.kyc as any)?.industry,
          revenue_last_12: Number((app?.kyc as any)?.annualRevenue || (app?.kyc as any)?.revenueLast12Months || 0) || undefined,
          monthly_revenue: Number((app?.kyc as any)?.monthlyRevenue || 0) || undefined,
          years_in_business: Number((app?.kyc as any)?.yearsInBusiness || 0) || undefined,
        });
        if (cancelled || items.length === 0) return;
        update({
          productRequirements: {
            ...((app?.productRequirements as Record<string, any>) || {}),
            aggregated: items,
          },
          selectedProductId: (app?.selectedProductId as string) || "aggregated",
        });
      } catch {
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (app.currentStep !== 5) {
      update({ currentStep: 5 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- BF_STEP_RESET_NORACE_v37 (Block 37) — running on every currentStep change caused unmounting step to reset back, fighting next step’s mount effect

  useEffect(() => {
    trackEvent("client_step_viewed", { step: 5 });
  }, []);

  // [removed] resolveStepGuard effect (was racing transitions)

  useEffect(() => {
    if (docError || missingRequiredDocs.length > 0 || hasBlockingUploadErrors) {
      scrollToFirstError();
    }
  }, [docError, hasBlockingUploadErrors, missingRequiredDocs.length]);

  useEffect(() => {
    let active = true;
    async function loadRequirements() {
      if (!app.applicationToken!) {
        setDocError("Missing application token. Please restart your application.");
        setIsLoading(false);
        return;
      }
      const amountValue = parseCurrencyAmount(app.kyc.fundingAmount);
      const countryCode = getCountryCode(app.kyc.businessLocation);
      let lenderProducts = ProductSync.load();
      if (!lenderProducts.length) {
        try {
          lenderProducts = await ProductSync.sync();
        } catch {
        }
      }
      // BF_CLIENT_BLOCK_v89_ELIGIBILITY_RULES_AND_MULTI_LEG_v1
      // Multi-leg doc union: each leg of the application contributes
      // its own required-doc set; we union and dedupe.
      const lookingFor = (app.kyc as any)?.lookingFor as
        | "capital" | "equipment" | "capital_and_equipment" | undefined;
      const closingCostsChecked = Boolean(
        (app as any).requires_closing_cost_funding ??
        (app as any).requiresClosingCostFunding
      );
      const equipmentAmount = parseCurrencyAmount(
        (app.kyc as any)?.equipmentAmount ?? app.kyc.fundingAmount
      );
      const capitalAmount = parseCurrencyAmount(
        (app.kyc as any)?.capitalAmount ?? app.kyc.fundingAmount
      );

      type Leg = { category: string; amount: number };
      const legs: Leg[] = [];
      if (lookingFor === "equipment" || /EQUIPMENT/i.test(lookingFor ?? "")) {
        legs.push({ category: "EQUIPMENT", amount: equipmentAmount });
        if (closingCostsChecked && equipmentAmount > 0) {
          const companion = Math.round(equipmentAmount * 0.2);
          legs.push({
            category: companion <= 50_000 ? "TERM" : "LOC",
            amount: companion,
          });
        }
      } else if (lookingFor === "capital_and_equipment" || /BOTH/i.test(lookingFor ?? "")) {
        if (selectedCategory) legs.push({ category: selectedCategory, amount: capitalAmount });
        legs.push({ category: "EQUIPMENT", amount: equipmentAmount });
      } else {
        legs.push({ category: selectedCategory, amount: amountValue });
      }

      const aggregatedByLeg = legs.flatMap((leg) => {
        const matching = filterProductsForApplicant(
          lenderProducts,
          countryCode,
          leg.amount
        );
        return aggregateRequiredDocuments(matching, leg.category, leg.amount);
      });
      // Dedupe by document_type, OR-ing the `required` flag.
      const aggregatedMap = new Map<string, typeof aggregatedByLeg[number]>();
      for (const entry of aggregatedByLeg) {
        const existing = aggregatedMap.get(entry.document_type);
        aggregatedMap.set(entry.document_type, {
          ...existing,
          ...entry,
          required: Boolean(existing?.required || entry.required),
        });
      }
      const aggregated = Array.from(aggregatedMap.values());
      const dynamicRules = getDynamicRequirementRules();
      // BF_CLIENT_WIZARD_STEP5_PHOTOIDS_v60 — partner photo ID is
      // required only when the applicant marked "multiple owners".
      const hasPartner = Boolean(app.applicant?.hasMultipleOwners);
      // BF_CLIENT_BLOCK_v102_MEDIA_NO_GLOBAL_DOCS_v1 — pass category so
      // MEDIA applications skip the bank-statements + photo-ID appendage.
      const normalized = ensureAlwaysRequiredDocuments(
        mergeRequirementLists(aggregated, dynamicRules),
        { hasPartner, category: selectedCategory }
      );

      if (active) {
        setIsLoading(true);
        setDocError(null);
        if (normalized.length === 0) {
          setDocError(
            "No document requirements were provided for the selected products."
          );
          setRequirementsRaw([]);
          setIsLoading(false);
          return;
        }
        let cachedFromStatus = null;
        try {
          const status = await ClientAppAPI.status(app.applicationToken!);
          cachedFromStatus = extractRequiredDocumentsFromStatus(status?.data ?? null);
        } catch {
        }
        // BF_CLIENT_BLOCK_v102_MEDIA_NO_GLOBAL_DOCS_v1 — same MEDIA carve-out
        // applies to the merge-with-cached-status path.
        const merged = cachedFromStatus
          ? ensureAlwaysRequiredDocuments(
              mergeRequirementLists(normalized, cachedFromStatus),
              { hasPartner, category: selectedCategory }
            )
          : normalized;
        setRequirementsRaw(merged);
        // BF_CLIENT_v66_STATUS_NO_LOOP — do NOT reset documentsDeferred on
        // Step 5 mount. The previous reset wiped the user's "upload docs
        // later" choice every time they re-entered Step 5 (e.g. via Back).
        update({
          productRequirements: {
            ...(app.productRequirements || {}),
            aggregated: merged,
          },
        });
        setIsLoading(false);
      }
    }

    loadRequirements();

    return () => {
      active = false;
    };
  }, [
    app.kyc.businessLocation,
    app.kyc.fundingAmount,
    app.selectedProductId,
    selectedCategory,
    // BF_CLIENT_WIZARD_STEP5_PHOTOIDS_v60 — re-load requirements when
    // the applicant toggles "multiple owners" so the partner photo ID
    // requirement appears / disappears in the same render pass.
    app.applicant?.hasMultipleOwners,
    update,
  ]);

  useEffect(() => {
    if (!app.applicationToken!) {
      setDocError("Missing application token. Please restart your application.");
      return;
    }
  }, [app.applicationToken!, app.selectedProductId]);

  // BF_CLIENT_v66_STATUS_NO_LOOP — only refresh fields the server's /status
  // endpoint actually returns. Until the server enriches /status with
  // documents / documentsDeferred / documentReviewComplete /
  // financialReviewComplete, leave them alone client-side. Writing the
  // empty defaults back was creating fresh object identities each poll
  // and re-firing this useEffect into an infinite loop.
  const refreshDocumentStatus = useCallback(() => {
    if (!app.applicationToken!) return;
    void ClientAppAPI.status(app.applicationToken!)
      .then((res) => {
        const cachedRequirements = syncRequiredDocumentsFromStatus(res?.data);
        if (cachedRequirements) {
          update({
            productRequirements: {
              ...(app.productRequirements || {}),
              aggregated: cachedRequirements,
            },
          });
        }
      })
      .catch(() => {
      });
  }, [app.applicationToken!, app.productRequirements, update]);

  useEffect(() => {
    refreshDocumentStatus();
  }, [refreshDocumentStatus]);

  useForegroundRefresh(() => {
    refreshDocumentStatus();
  }, [refreshDocumentStatus]);

  async function handleFile(docType: string, file: File | null) {
    if (!file || !app.applicationToken!) return;

    setDocErrors((prev) => ({ ...prev, [docType]: "" }));

    try {
      validateFile(file);
    } catch (error) {
      const message =
        error instanceof Error && error.message === "File exceeds 25MB limit"
          ? "File too large. Max 25 MB."
          : "Unsupported file type. Allowed: PDF, DOCX, XLSX, PNG, JPG.";
      setDocErrors((prev) => ({
        ...prev,
        [docType]: message,
      }));
      return;
    }

    setUploadingDocs((prev) => ({ ...prev, [docType]: true }));
    setUploadProgress((prev) => ({ ...prev, [docType]: 0 }));

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const uploadRes = await ClientAppAPI.uploadDocument({
          applicationId: app.applicationId,
          applicationToken: app.applicationToken!,
          documentType: docType,
          file,
          onProgress: (progress) => {
            setUploadProgress((prev) => ({ ...prev, [docType]: progress }));
          },
        });

        // BF_CLIENT_STEP5_OPTIMISTIC_v80 — write the doc to local state
        // immediately on 200. Step 5's `missingRequiredDocs` reads from
        // app.documents; if we wait on the server status response we can hang
        // until the next render tick (or forever, if the status endpoint is
        // not returning the documents map yet — see BF-Server Block 80).
        const uploadedId =
          ((uploadRes as any)?.data?.data?.id ?? (uploadRes as any)?.data?.id) || null;
        update({
          documentsDeferred: false,
          documents: {
            ...app.documents,
            [docType]: {
              id: uploadedId,
              name: file.name,
              status: "uploaded",
              uploadedAt: new Date().toISOString(),
            },
          },
        });

        // Refetch in the background; if it returns documents we'll merge them.
        try {
          const refreshed = await ClientAppAPI.status(app.applicationToken!);
          const hydrated = extractApplicationFromStatus(refreshed?.data || {}, app.applicationToken!);
          if (hydrated.documents && Object.keys(hydrated.documents).length > 0) {
            update({
              documents: { ...app.documents, ...hydrated.documents },
              documentReviewComplete:
                hydrated.documentReviewComplete ?? app.documentReviewComplete,
              financialReviewComplete:
                hydrated.financialReviewComplete ?? app.financialReviewComplete,
            });
          }
        } catch {
          // Non-fatal — the optimistic update already enabled Continue.
        }

        setDocErrors((prev) => ({ ...prev, [docType]: "" }));
        trackEvent("document_uploaded", { category: docType });
        trackEvent("client_document_uploaded", { documentType: docType });
        track("document_uploaded", { documentType: docType });
        break;
      } catch {
        if (attempt === 3) {
          // BF_UPLOAD_QUEUE_v51 — on final failure, queue file for background retry.
          try {
            await enqueueUploadFromFile({
              applicationToken: app.applicationToken!,
              applicationId: app.applicationId,
              documentType: docType,
              file,
            });
            setDocErrors((prev) => ({
              ...prev,
              [docType]: "Upload failed right now. Queued for retry while you continue.",
            }));
          } catch {
            setDocErrors((prev) => ({
              ...prev,
              [docType]: "Document upload failed. Please retry.",
            }));
          }
        }
      }
    }

    setUploadingDocs((prev) => ({ ...prev, [docType]: false }));
    setUploadProgress((prev) => ({ ...prev, [docType]: 0 }));
  }


  function next() {
    if (missingRequiredDocs.length > 0 || hasBlockingUploadErrors) {
      setDocError("Please upload all required documents.");
      return;
    }
    void persistApplicationStep(app, 5, {
      documents: app.documents,
      documentsDeferred: Boolean(app.documentsDeferred),
    })
      .then(() => {
        setDocError(null);
        track("step_completed", { step: 5 });
        update({ currentStep: 6 });
        navigate("/apply/step-6");
      })
      .catch(() => {
        setDocError("We couldn't save this step. Please try again.");
      });
  }

  async function uploadLater() {
    if (!app.applicationToken!) {
      setDocError("Missing application token. Please restart your application.");
      return;
    }
    // BF_CLIENT_STEP5_DEFER_HARDENED_v80 — set the local flag first so the
    // "Continue" path treats this as a valid Step 5 completion regardless of
    // whether the server PATCH or the local persistApplicationStep call hits a
    // transient error. The server PATCH is the source of truth, but we never
    // block the user from advancing once they've made the choice.
    update({ documentsDeferred: true });
    track("step_completed", { step: 5, deferred: true });

    try {
      await ClientAppAPI.deferDocuments(app.applicationToken!);
    } catch (err) {
      // Log but do not block — the next persist will pick up documentsDeferred.
      console.warn("[step5] deferDocuments PATCH failed; continuing anyway", err);
    }

    try {
      await persistApplicationStep(app, 5, {
        documents: app.documents,
        documentsDeferred: true,
      });
    } catch (err) {
      console.warn("[step5] persistApplicationStep failed; continuing anyway", err);
    }

    update({ currentStep: 6 });
    navigate("/apply/step-6");
  }

  // BF_CLIENT_STEP5_DIAG_v80 — dev-only log to make stuck-Continue cases
  // diagnosable from the browser console without DevTools network panel.
  if (typeof window !== "undefined" && (import.meta as any)?.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[step5] gate", {
      docError,
      isLoading,
      missingRequiredDocs,
      hasBlockingUploadErrors,
      hasUploadsInFlight,
      documentsDeferred: app.documentsDeferred,
    });
  }

  const canContinue =
    !docError &&
    !isLoading &&
    missingRequiredDocs.length === 0 &&
    !hasBlockingUploadErrors &&
    !hasUploadsInFlight;

  function getDocStatus(docType: string): DocumentStatus {
    return resolveDocumentStatus(app.documents[docType]);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "0 0 48px" }}>
      <div style={{ height: 4, background: "#e5e7eb", width: "100%" }}>
        <div style={{ height: 4, background: "#2563eb", width: `${(5 / 6) * 100}%`, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 0" }}>
        <h1 style={{ color: "#2563eb", fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Step 5: Required Documents</h1>
        <p style={{ color: "#6b7280", textAlign: "center", marginBottom: 32, fontSize: 15 }}>Upload all required documents to continue.</p>
    <WizardLayout>
      <StepHeader step={5} title="Required Documents" />

      <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}>
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing.sm }}>
            <Spinner />
            <span style={components.form.helperText}>Loading document requirements…</span>
          </div>
        )}
        {docError && (
          <Card variant="muted" data-error={true}>
            <div style={components.form.errorText}>{docError}</div>
          </Card>
        )}
        {missingRequiredDocs.length > 0 && (
          <Card
            variant="muted"
            data-error={true}
            style={{ background: "rgba(245, 158, 11, 0.12)" }}
          >
            <div style={{ fontWeight: 600, marginBottom: tokens.spacing.xs }}>
              Missing required documents:
            </div>
            <DocumentUploadList
              documents={missingRequiredDocs.map(formatDocumentLabel)}
            />
          </Card>
        )}
        {/* BF_CLIENT_WIZARD_STEP5_DEFER_BTN_v59 — defer-upload action
          placed under the missing-documents banner and above the
          upload list, where users see it before they've scrolled past
          the upload section. The duplicate at the bottom of the
          sticky CTA bar was removed. */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="ghost"
            onClick={uploadLater}
            disabled={isLoading || hasUploadsInFlight}
          >
            I will supply all required documents at a later time
          </Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}>
          {groupedRequirements.map(([category, entries]) => (
            <div key={category} style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.sm }}>
              <div style={{ fontWeight: 600, color: tokens.colors.textSecondary }}>
                {category}
              </div>
              {entries.map((entry) => {
                const docType = entry.document_type;
                return (
                  <RequirementRow
                    key={entry.id}
                    entry={entry}
                    app={app}
                    isUploading={Boolean(uploadingDocs[docType])}
                    progress={uploadProgress[docType] || 0}
                    docError={docErrors[docType]}
                    docStatus={getDocStatus(docType)}
                    onPick={(entryId) => document.getElementById(`doc-${entryId}`)?.click()}
                    onDrop={handleFile}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ ...layout.stickyCta, marginTop: tokens.spacing.lg }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: tokens.spacing.sm }}>
          <Button
            variant="secondary"
            style={{ width: "100%", maxWidth: "160px" }}
            onClick={() => navigate("/apply/step-4")}
          >
            Back
          </Button>
          <Button
            style={{ width: "100%", maxWidth: "220px" }}
            onClick={next}
            disabled={!canContinue}
          >
            Continue
          </Button>
          {/* BF_CLIENT_WIZARD_STEP5_DEFER_BTN_v59 — the old "Supply
            Documents Later" button that lived here was moved up to
            sit under the missing-docs banner. Search this file for
            the matching anchor to find its new location. */}
        </div>
      </div>
    </WizardLayout>
    </div>
    </div>
  );
}

export default Step5_Documents;
