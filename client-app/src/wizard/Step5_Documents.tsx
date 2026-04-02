// @ts-nocheck
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { handleApi } from "@/lib/handleApi";
import {
  getRejectionMessage,
  resolveDocumentStatus,
  type DocumentStatus,
} from "../documents/documentStatus";

function getDynamicRequirementRules() {
  return [
    { id: "bank_statements", document_type: "bank_statements", required: true },
    { id: "financial_statements", document_type: "financial_statements", required: true },
    { id: "tax_returns", document_type: "tax_returns", required: true },
    { id: "contracts", document_type: "contracts", required: true },
    { id: "invoices", document_type: "invoices", required: true },
  ];
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
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0] || null;
        onDrop(docType, file);
      }}
    >
      <input
        id={`doc-${entry.id}`}
        type="file"
        accept=".pdf,.docx,.xlsx,.png,.jpg"
        style={{ display: "none" }}
        onChange={(e: unknown) => onDrop(docType, e.target.files?.[0] || null)}
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
          Upload file
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

  useEffect(() => {
    if (app.currentStep !== 5) {
      update({ currentStep: 5 });
    }
  }, [app.currentStep, update]);

  useEffect(() => {
    trackEvent("client_step_viewed", { step: 5 });
  }, []);

  useEffect(() => {
    const guardedStep = resolveStepGuard(app.currentStep, 5);
    if (guardedStep !== 5) {
      navigate(`/apply/step-${guardedStep}`, { replace: true });
    }
  }, [app.currentStep, navigate]);

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
      const matchingProducts = filterProductsForApplicant(
        lenderProducts,
        countryCode,
        amountValue
      );
      const aggregated = aggregateRequiredDocuments(
        matchingProducts,
        selectedCategory,
        amountValue
      );
      const dynamicRules = getDynamicRequirementRules();
      const normalized = ensureAlwaysRequiredDocuments(mergeRequirementLists(aggregated, dynamicRules));

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
          const status = await handleApi(() => ClientAppAPI.status(app.applicationToken!));
          cachedFromStatus = extractRequiredDocumentsFromStatus(status?.data ?? null);
        } catch {
        }
        const merged = cachedFromStatus
          ? ensureAlwaysRequiredDocuments(
              mergeRequirementLists(normalized, cachedFromStatus)
            )
          : normalized;
        setRequirementsRaw(merged);
        update({
          productRequirements: {
            ...(app.productRequirements || {}),
            aggregated: merged,
          },
          documentsDeferred: false,
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
    update,
  ]);

  useEffect(() => {
    if (!app.applicationToken!) {
      setDocError("Missing application token. Please restart your application.");
      return;
    }
  }, [app.applicationToken!, app.selectedProductId]);

  const refreshDocumentStatus = useCallback(() => {
    if (!app.applicationToken!) return;
    void handleApi(() => ClientAppAPI.status(app.applicationToken!))
      .then((res) => {
        const refreshed = extractApplicationFromStatus(
          res?.data ?? {},
          app.applicationToken!
        );
        const cachedRequirements = syncRequiredDocumentsFromStatus(res?.data);
        update({
          documents: refreshed.documents || app.documents,
          documentsDeferred:
            typeof refreshed.documentsDeferred === "boolean"
              ? refreshed.documentsDeferred
              : app.documentsDeferred,
          documentReviewComplete:
            refreshed.documentReviewComplete ?? app.documentReviewComplete,
          financialReviewComplete:
            refreshed.financialReviewComplete ?? app.financialReviewComplete,
          productRequirements: cachedRequirements
            ? {
                ...(app.productRequirements || {}),
                aggregated: cachedRequirements,
              }
            : app.productRequirements,
        });
      })
      .catch(() => {
      });
  }, [
    app.applicationToken!,
    app.documents,
    app.documentsDeferred,
    app.documentReviewComplete,
    app.financialReviewComplete,
    update,
  ]);

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
        await handleApi(() => ClientAppAPI.uploadDocument({
          applicationToken: app.applicationToken!,
          applicationId: app.applicationId,
          documentType: docType,
          file,
          onProgress: (progress) => {
            setUploadProgress((prev) => ({ ...prev, [docType]: progress }));
          },
        }));

        const refreshed = await handleApi(() => ClientAppAPI.status(app.applicationToken!));
        const hydrated = extractApplicationFromStatus(refreshed?.data || {}, app.applicationToken!);

        update({
          documentsDeferred: false,
          documents: hydrated.documents || app.documents,
          documentReviewComplete: hydrated.documentReviewComplete ?? app.documentReviewComplete,
          financialReviewComplete: hydrated.financialReviewComplete ?? app.financialReviewComplete,
        });
        setDocErrors((prev) => ({ ...prev, [docType]: "" }));
        trackEvent("document_uploaded", { category: docType });
        trackEvent("client_document_uploaded", { documentType: docType });
        track("document_uploaded", { documentType: docType });
        break;
      } catch {
        if (attempt === 3) {
          setDocErrors((prev) => ({
            ...prev,
            [docType]: "Document upload failed. Please retry.",
          }));
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
    try {
      await handleApi(() => ClientAppAPI.deferDocuments(app.applicationToken!));
      update({ documentsDeferred: true });
      await persistApplicationStep(app, 5, {
        documents: app.documents,
        documentsDeferred: true,
      });
      track("step_completed", { step: 5, deferred: true });
      navigate("/apply/step-6");
    } catch {
      setDocError("Couldn't defer documents. Please try again.");
    }
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
          <Button
            variant="ghost"
            style={{ width: "100%", maxWidth: "220px" }}
            onClick={uploadLater}
            disabled={isLoading || hasUploadsInFlight}
          >
            Supply Documents Later
          </Button>
        </div>
      </div>
    </WizardLayout>
  );
}

export default Step5_Documents;
