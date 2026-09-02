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
// BF_CLIENT_SBA_SKIP_2_AND_5_v213
import { isSbaWizardPath } from "./wizardSchema";
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
import AccountantReferralModal, {
  type AccountantDetails,
} from "@/components/AccountantReferralModal";

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
  submitAttempted,
}) {
  const docType = entry.document_type;
  return (
    <FileUploadCard
      key={entry.id}
      title={formatDocumentLabel(docType)}
      status={isUploading ? `Uploading ${progress}%` : (entry.required ? docStatus : (docStatus === "missing" ? "Optional" : docStatus))}
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
        {/* BF_CLIENT_AUDIT_FIX_v6 -- removed duplicate doc title; FileUploadCard already shows it */}
        <label style={{ display: "flex", alignItems: "center", gap: tokens.spacing.xs }} aria-label={formatDocumentLabel(docType)}>
          <Checkbox checked={docStatus !== "missing"} readOnly />
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
        {app.documents[docType] && (() => {
          const files = ((app.documents[docType] as any)?.files) as Array<{ name: string }> | undefined;
          const list = files && files.length ? files : [{ name: app.documents[docType].name }];
          return (
            <div style={components.form.helperText}>
              Uploaded ({list.length}):
              {list.map((fl, i) => (
                <div key={i}>• {fl.name}</div>
              ))}
            </div>
          );
        })()}
        {docError && <div style={components.form.errorText}>{docError}</div>}
        {!docError && submitAttempted && docStatus === "missing" && entry.required && <div style={components.form.errorText}>This document is required.</div>}
        {docStatus === "rejected" && <div style={components.form.errorText}>{getRejectionMessage(app.documents[docType])}</div>}
      </div>
    </FileUploadCard>
  );
});


// BF_CLIENT_STEP5_OPTIONS_v174
// A plain "Or" between the three document options. Rendered as a hairline with
// the word centred on it, so the choice is visible at a glance on a long page.
function OptionSeparator() {
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      <span style={{ flex: 1, height: 1, background: tokens.colors.border }} />
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: tokens.colors.textSecondary,
        }}
      >
        Or
      </span>
      <span style={{ flex: 1, height: 1, background: tokens.colors.border }} />
    </div>
  );
}

export function Step5_Documents() {
  const { app, update } = useApplicationStore();
  const navigate = useNavigate();

  // BF_CLIENT_SBA_SKIP_2_AND_5_v213
  // Step 4 already routes the SBA path straight to Review
  // (BF_CLIENT_SBA_SKIP_DOCS_v192), and yet Step 5 was still being reached.
  // Rather than chase which upstream branch let it through, refuse to render
  // here: every SBA document is Stage 2, so this screen has nothing to ask for
  // and asking anyway is how an applicant is sent looking for bank statements a
  // pre-revenue business does not have.
  //
  // A guard at the destination also covers the routes Step 4 does not control -
  // a bookmark, a browser Back, or a resumed draft landing on /apply/step-5.
  const onSbaPath = isSbaWizardPath(app as Record<string, unknown>); // BF_CLIENT_SBA_PATH_FROM_PRODUCT_v160
  useEffect(() => {
    if (!onSbaPath) return;
    // Mirrors Step 4: documentsDeferred is what the Step 6 submit gate checks,
    // and currentStep must be 6 or resolveStepGuard bounces back to Documents.
    update({ currentStep: 6, documentsDeferred: true });
    navigate("/apply/step-6", { replace: true });
  }, [onSbaPath]);
  if (onSbaPath) return null;
  const [requirementsRaw, setRequirementsRaw] = useState<
    LenderProductRequirement[]
  >([]);
  const [docError, setDocError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false); // BF_CLIENT_AUDIT_FIX_v7
  const [accountantOpen, setAccountantOpen] = useState(false);
  const [accountantBusy, setAccountantBusy] = useState(false);
  // BF_CLIENT_ACCOUNTANT_SURFACE_FAILURE_v1
  const [accountantError, setAccountantError] = useState<string | null>(null);
  const selectedCategory =
    app.productCategory ||
    app.selectedProductType ||
    app.selectedProduct?.product_type ||
    app.selectedProduct?.name ||
    "";

  const orderedRequirements = useMemo(() => {
    // BF_CLIENT_BLOCK_v328 — Step 5 shows Stage-1 docs only; Stage-2 handled in CMP.
    return sortRequirements(requirementsRaw).filter(
      (e) =>
        (((e as { stage?: number }).stage) ?? 1) === 1 &&
        // BF_CLIENT_BLOCK_v711_STEP5_NO_ADVISORS_v1 — Professional Advisors is a
        // Stage-2 CMP form, never a Step-5 upload; exclude regardless of staging.
        !/professional\s*advisor/i.test(String((e as { document_type?: string }).document_type ?? ""))
    );
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

  // BF_CLIENT_BLOCK_v107_DOC_REQUIREMENTS_SHAPE_FIX_v1 — pull deduped union
  // (supersedes v106; fetcher now returns LenderProductRequirement[])
  // pull deduped union
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

  // BF_CLIENT_BLOCK_v130b_STEP5_SCROLL_AND_OTP_PHONE_CLAIM_v1 — (A)
  // The previous autosroll useEffect ran scrollToFirstError() whenever
  // docError / missingRequiredDocs.length / hasBlockingUploadErrors
  // changed. That fires on every successful upload (which removes a
  // doc from the missing list, mutating the array length), slamming
  // the page back to the top mid-flow. The scroll is now invoked
  // exactly once inside next() on the missing-docs error branch.

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
      const equipmentAmount = parseCurrencyAmount(
        (app.kyc as any)?.equipmentAmount ?? app.kyc.fundingAmount
      );
      const capitalAmount = parseCurrencyAmount(
        (app.kyc as any)?.capitalAmount ?? app.kyc.fundingAmount
      );

      type Leg = { category: string; amount: number };
      const legs: Leg[] = [];
      // BF_CLIENT_BLOCK_v127b_LEG_BUILD_EXACT_MATCH_v1
      // Tighten branch dispatch to exact-match (uppercase enum form OR
      // lowercase rules form). Previously regex substring matching on lookingFor
      // matched "capital_and_equipment" and misrouted C&E to the
      // equipment-only branch. Today the wizard always stores uppercase
      // ("WORKING_CAPITAL", "EQUIPMENT", "BOTH") so this was latent —
      // but a future refactor that lowercases lookingFor would silently
      // break C&E doc collection.
      const lookingForUpper = String(lookingFor ?? "").toUpperCase();
      const isEquipmentOnly =
        lookingForUpper === "EQUIPMENT";
      const isCapitalAndEquipment =
        lookingForUpper === "BOTH" ||
        lookingForUpper === "CAPITAL_AND_EQUIPMENT";
      if (isEquipmentOnly) {
        // BF_CLIENT_BLOCK_v861_EQUIP_PARENT_LEG_ONLY — the parent equipment
        // application aggregates ONLY its own equipment leg. The closing-cost
        // portion is a SEPARATE linked application (created in Step 2 via
        // createLinkedApplication with product_category EQUIPMENT_FINANCE) and
        // collects its own documents on its own card. Previously this branch
        // pushed a phantom companion leg (TERM/LOC by amount) whose lender
        // products dragged the Accord CMP forms (Flinks / CRA / Professional
        // advisors) onto the EQUIPMENT app's required-document set.
        legs.push({ category: "EQUIPMENT", amount: equipmentAmount });
      } else if (isCapitalAndEquipment) {
        if (selectedCategory) legs.push({ category: selectedCategory, amount: capitalAmount });
        legs.push({ category: "EQUIPMENT", amount: equipmentAmount });
      } else {
        legs.push({ category: selectedCategory, amount: amountValue });
      }

      // BF_CLIENT_BLOCK_v119_STEP5_PREFER_SERVER_REQUIRED_DOCS_v1
      // The server's /api/portal/lender-products/required-docs route
      // (BF-Server v115 / v117 / v118) is the authoritative source for
      // the deduped union of required document categories — it normalizes
      // long->short product-category codes (TERM_LOAN->TERM) and probes
      // the live amount_min / amount_max columns. The client's
      // aggregateRequiredDocuments below compares the wizard's long
      // codes against the DB's short codes WITHOUT normalization, so it
      // filtered out every product and the rendered list collapsed to
      // just the global appendage (bank statements + photo ID). Try the
      // server first; fall back to the client union only if the server
      // returns nothing or is unreachable (offline / 5xx).
      // BF_CLIENT_BLOCK_v126b_CAPITAL_EQUIPMENT_FIXES_v1
      // Multi-leg server query. For Capital & Equipment (and any future
      // multi-leg flow), each leg contributes its own required-doc set;
      // we union them. Single-leg flows still make exactly one server hit
      // — same network cost, same behavior. Two-leg flows (C&E, equipment
      // + closing costs) make two parallel hits.
      let aggregated: LenderProductRequirement[] = [];
      try {
        const commonParams = {
          country:
            countryCode ||
            (app?.kyc as any)?.country ||
            (app?.kyc as any)?.businessLocation,
          industry: (app?.kyc as any)?.industry,
          revenue_last_12:
            Number(
              (app?.kyc as any)?.annualRevenue ||
                (app?.kyc as any)?.revenueLast12Months ||
                0
            ) || undefined,
          monthly_revenue:
            Number((app?.kyc as any)?.monthlyRevenue || 0) || undefined,
          years_in_business:
            Number((app?.kyc as any)?.yearsInBusiness || 0) || undefined,
        };
        const legResults = await Promise.all(
          legs.map(async (leg) => {
            const category =
              leg.category || (app?.productCategory as string | undefined);
            try {
              return await fetchRequiredDocsUnion({
                ...commonParams,
                product_category: category,
                funding_amount: leg.amount || undefined,
              });
            } catch {
              return [] as LenderProductRequirement[];
            }
          })
        );
        const docMap = new Map<string, LenderProductRequirement>();
        for (const items of legResults) {
          for (const item of items) {
            const key = (item as any).document_type ?? (item as any).category;
            if (!key) continue;
            const existing = docMap.get(key);
            docMap.set(key, {
              ...existing,
              ...item,
              required: Boolean(
                existing?.required || (item as any).required
              ),
            });
          }
        }
        if (docMap.size > 0) {
          aggregated = Array.from(docMap.values());
        }
      } catch {
      }

      if (aggregated.length === 0) {
        const aggregatedByLeg = legs.flatMap((leg) => {
          const matching = filterProductsForApplicant(
            lenderProducts,
            countryCode,
            leg.amount
          );
          return aggregateRequiredDocuments(matching, leg.category, leg.amount);
        });
        const aggregatedMap = new Map<string, typeof aggregatedByLeg[number]>();
        for (const entry of aggregatedByLeg) {
          const existing = aggregatedMap.get(entry.document_type);
          aggregatedMap.set(entry.document_type, {
            ...existing,
            ...entry,
            required: Boolean(existing?.required || entry.required),
          });
        }
        aggregated = Array.from(aggregatedMap.values());
      }
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
        // BF_CLIENT_BLOCK_v330_MULTIFILE_LIST — accumulate EVERY file uploaded to
        // this requirement so Step 5 lists all of them (e.g. 6 bank statements),
        // not just the most recent. Top-level fields stay for status/gate compat.
        update({
          documentsDeferred: false,
          documents: {
            ...app.documents,
            [docType]: {
              id: uploadedId,
              name: file.name,
              status: "uploaded",
              uploadedAt: new Date().toISOString(),
              files: [
                ...((((app.documents[docType] as any)?.files) as Array<{ id: string | null; name: string; uploadedAt: string }>) ?? []),
                { id: uploadedId, name: file.name, uploadedAt: new Date().toISOString() },
              ],
            } as any,
          },
        });

        // Refetch in the background; if it returns documents we'll merge them.
        try {
          const refreshed = await ClientAppAPI.status(app.applicationToken!);
          const hydrated = extractApplicationFromStatus(refreshed?.data || {}, app.applicationToken!);
          if (hydrated.documents && Object.keys(hydrated.documents).length > 0) {
            // BF_CLIENT_BLOCK_v330_MULTIFILE_LIST — keep the client files[] arrays
            // when the server status (one row per type) merges in.
            const mergedDocs: Record<string, any> = { ...app.documents };
            for (const [k, v] of Object.entries(hydrated.documents)) {
              const existingFiles = (app.documents[k] as any)?.files;
              mergedDocs[k] = { ...(v as any), files: existingFiles ?? (v as any)?.files };
            }
            update({
              documents: mergedDocs,
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
      } catch (err) {
        // BF_CLIENT_STEP5_PERMANENT_4XX_v1 - the server rejected this exact
        // file (unsupported type / too large / bad request). Queueing it for
        // background retry can never succeed; tell the applicant what to fix.
        const st = (err as { status?: number })?.status;
        if (typeof st === "number" && st >= 400 && st < 500 && st !== 408 && st !== 429) {
          setDocErrors((prev) => ({
            ...prev,
            [docType]:
              st === 415 ? "That file type is not supported. Please upload a PDF, Word document, Excel file, or a photo (PNG/JPEG/HEIC)."
              : st === 413 ? "That file is too large. Please use a smaller file (under 25 MB)."
              : "This file was rejected. Please check it and try a different file.",
          }));
          break;
        }
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
    setSubmitAttempted(true);
    if (missingRequiredDocs.length > 0 || hasBlockingUploadErrors) {
      setDocError("Please upload all required documents.");
      // BF_CLIENT_BLOCK_v130b_STEP5_SCROLL_AND_OTP_PHONE_CLAIM_v1 — (A)
      // Single, intentional scroll-to-error invocation. Triggered only
      // when the user explicitly clicks Continue with missing/rejected
      // docs — never on every upload state mutation.
      scrollToFirstError();
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

  // BF_CLIENT_STEP5_ACCOUNTANT_v1 - capture the accountant first, then use the
  // existing deferral path so both Step 5 actions advance identically.
  // BF_CLIENT_ACCOUNTANT_SURFACE_FAILURE_v1 - the `if (app.applicationId)`
  // guard and the console.warn-only catch both hid total failure: the modal
  // closed, the wizard advanced, and no invitation was ever sent. Neither the
  // applicant nor Boreal had any signal. Both now stop the flow and say so.
  async function referAccountant(details: AccountantDetails) {
    setAccountantBusy(true);
    setAccountantError(null);
    try {
      if (!app.applicationId) {
        throw new Error("missing_application_id");
      }
      await ClientAppAPI.referAccountant(String(app.applicationId), {
        ...details,
        businessName: app.business?.businessName ?? "",
      });
    } catch (err) {
      console.error("[step5] referAccountant failed", err);
      setAccountantBusy(false);
      setAccountantError(
        "We couldn't send this to your accountant. Please check the details and try again, or upload the documents yourself."
      );
      return;
    }
    setAccountantBusy(false);
    setAccountantOpen(false);
    await uploadLater();
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

  // BF_CLIENT_BLOCK_v_WIZARD_DIRECTION_A_FINISH_v1 — removed duplicate shell/heading.
  return (
    <WizardLayout>
      <StepHeader step={5} title="Required Documents" subtitle="Add the files below. You can also finish these later from your portal." />

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
        {/* BF_CLIENT_STEP5_OPTIONS_v174 - the two buttons below are
          ALTERNATIVES to uploading, not extra steps. Without this line a user
          reads them as more work rather than a way out. */}
        {missingRequiredDocs.length > 0 && (
          <p
            data-testid="step5-options-intro"
            style={{
              margin: `${tokens.spacing.md} 0 0`,
              fontSize: 15,
              lineHeight: 1.6,
              color: tokens.colors.textSecondary,
            }}
          >
            You have three options. You can supply documents now, supply them
            later and finalize the application now, or have your accountant
            upload the required documents.
          </p>
        )}
        {/* BF_CLIENT_STEP5_OPTIONS_v174 - "Or" between each option, so the
          three read as a choice rather than a sequence. */}
        {/* BF_CLIENT_WIZARD_STEP5_DEFER_BTN_v59 — defer-upload action
          placed under the missing-documents banner and above the
          upload list, where users see it before they've scrolled past
          the upload section. The duplicate at the bottom of the
          sticky CTA bar was removed. */}
        {/* BF_CLIENT_BLOCK_v158 — defer-upload action upgraded from a
          subtle right-aligned ghost link to a prominent centered
          secondary button. Per Todd: "needs to be an obvious button
          entered in the window". Full-width on mobile, 420px cap on
          desktop. 48px tap target, visible border. */}
        <div style={{ display: "flex", justifyContent: "center", margin: `${tokens.spacing.md} 0` }}>
          <Button
            variant="secondary"
            onClick={uploadLater}
            disabled={isLoading || hasUploadsInFlight}
            style={{
              width: "100%",
              maxWidth: "420px",
              minHeight: "48px",
              fontWeight: 600,
              // BF_CLIENT_STEP5_OPTIONS_v174 - the hairline border read as an
              // inert panel. Navy makes it look pressable without competing
              // with the gold primary action.
              border: `2px solid ${tokens.colors.primary}`,
            }}
          >
            I will supply all required documents at a later time
          </Button>
        </div>
        <OptionSeparator />
        {/* BF_CLIENT_STEP5_ACCOUNTANT_v1 */}
        <div style={{ display: "flex", justifyContent: "center", margin: `${tokens.spacing.md} 0` }}>
          <Button
            variant="secondary"
            data-testid="step5-accountant-btn"
            onClick={() => setAccountantOpen(true)}
            disabled={isLoading || hasUploadsInFlight}
            style={{
              width: "100%",
              maxWidth: "420px",
              minHeight: "48px",
              fontWeight: 600,
              border: `2px solid ${tokens.colors.primary}`,
            }}
          >
            Have my accountant upload the documents
          </Button>
        </div>
        <OptionSeparator />
        <AccountantReferralModal
          open={accountantOpen}
          busy={accountantBusy}
          onCancel={() => setAccountantOpen(false)}
          onSubmit={(details) => { void referAccountant(details); }}
          submitError={accountantError}
        />
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
                    submitAttempted={submitAttempted}
                    onPick={(entryId) => document.getElementById(`doc-${entryId}`)?.click()}
                    onDrop={handleFile}
                  />
                );
              })}
            </div>
          ))}
          {/* BF_CLIENT_BLOCK_v819_STEP5_OTHER — optional catch-all upload. Never required (does not
              gate Continue) and never OCR'd server-side; flows to the lender package once staff accept it. */}
          <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.sm }}>
            <div style={{ fontWeight: 600, color: tokens.colors.textSecondary }}>Other (optional)</div>
            <RequirementRow
              key="other"
              entry={{ id: "other", document_type: "other", required: false } as any}
              app={app}
              isUploading={Boolean(uploadingDocs["other"])}
              progress={uploadProgress["other"] || 0}
              docError={docErrors["other"]}
              docStatus={getDocStatus("other")}
              onPick={(entryId) => document.getElementById(`doc-${entryId}`)?.click()}
              onDrop={handleFile}
            />
          </div>
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
  );
}

export default Step5_Documents;
