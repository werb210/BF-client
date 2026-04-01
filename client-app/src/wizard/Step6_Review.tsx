// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApplicationStore } from "../state/useApplicationStore";
import { TERMS_TEXT } from "../data/terms";
import { ClientAppAPI } from "../api/clientApp";
import { StepHeader } from "../components/StepHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { WizardLayout } from "../components/WizardLayout";
import { submitApplication } from "../api/applications";
import {
  assertSubmissionReady,
  buildSubmissionPayload,
  canSubmitApplication,
  getMissingRequiredDocs,
  shouldBlockForMissingDocuments,
} from "./submission";
import { ClientProfileStore } from "../state/clientProfiles";
import { FileUploadCard } from "../components/FileUploadCard";
import { Checkbox } from "../components/ui/Checkbox";
import { extractApplicationFromStatus } from "../applications/resume";
import { filterRequirementsByAmount, type LenderProductRequirement } from "./requirements";
import { components, layout, tokens } from "@/styles";
import { resolveStepGuard } from "./stepGuard";
import { clearDraft } from "../client/autosave";
import {
  clearSubmissionIdempotencyKey,
  getOrCreateSubmissionIdempotencyKey,
} from "../client/submissionIdempotency";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import {
  calculateApplicationQuality,
  classifyReadiness,
  estimateClientCommission,
  getClientAttribution,
  getLeadFingerprint,
  getSessionId,
  incrementUnderwritingScore,
  track,
  trackConversion,
  trackEvent,
} from "../utils/analytics";
import { apiCall } from "../api/client";
import { clearStoredReadinessSession } from "@/api/website";
import { parseCurrencyAmount } from "./productSelection";
import { logError } from "@/lib/logger";

export function Step6_Review(): JSX.Element {
  const { app, update } = useApplicationStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>(
    {}
  );
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const navigate = useNavigate();
  const { isOffline } = useNetworkStatus();
  const isOnline = !isOffline;
  const [idempotencyKey] = useState(() => getOrCreateSubmissionIdempotencyKey());
  const [lenderCount, setLenderCount] = useState<number | null>(null);
  const firstDocStartTime = useRef<number>(Date.now());
  const hasTrackedFirstDocumentUpload = useRef(false);
  const hasTrackedUnderwritingPackageReady = useRef(false);
  const hasPartner = Boolean(app.applicant?.hasMultipleOwners);
  const requirementsKey = useMemo(
    () => (app.productRequirements?.aggregated ? "aggregated" : app.selectedProductId),
    [app.productRequirements, app.selectedProductId]
  );
  const requiredDocTypes = useMemo(() => {
    if (!requirementsKey) return [];
    const requirements =
      (app.productRequirements?.[requirementsKey] || []) as LenderProductRequirement[];
    return filterRequirementsByAmount(requirements, app.kyc?.fundingAmount)
      .filter((entry) => entry.required)
      .map((entry) => entry.document_type);
  }, [app.kyc?.fundingAmount, app.productRequirements, requirementsKey]);
  const missingRequiredDocs = useMemo(() => getMissingRequiredDocs(app), [app]);
  const docsAccepted = useMemo(() => {
    if (app.documentsDeferred) return true;
    if (requiredDocTypes.length === 0) return true;
    return requiredDocTypes.every(
      (docType) => app.documents[docType]?.status === "accepted"
    );
  }, [app.documents, app.documentsDeferred, requiredDocTypes]);
  const processingComplete = useMemo(() => {
    if (app.documentsDeferred) return true;
    return Boolean(app.documentReviewComplete && app.financialReviewComplete);
  }, [app.documentReviewComplete, app.documentsDeferred, app.financialReviewComplete]);
  const ocrComplete = app.documentsDeferred ? true : Boolean(app.ocrComplete ?? app.documentReviewComplete);
  const creditSummaryComplete = app.documentsDeferred
    ? true
    : Boolean(app.creditSummaryComplete ?? app.financialReviewComplete);
  const idRequirements = useMemo(
    () => [
      {
        key: "primary_applicant_id",
        label: "Primary applicant photo ID",
        required: true,
      },
      {
        key: "partner_applicant_id",
        label: "Business partner photo ID",
        required: hasPartner,
      },
    ],
    [hasPartner]
  );
  const missingIdDocs = useMemo(
    () =>
      idRequirements
        .filter((entry) => entry.required)
        .filter((entry) => {
          const doc = app.documents[entry.key];
          if (!doc) return true;
          return doc.status === "rejected";
        })
        .map((entry) => entry.key),
    [app.documents, idRequirements]
  );

  useEffect(() => {
    if (app.currentStep !== 6) {
      update({ currentStep: 6 });
    }
  }, [app.currentStep, update]);

  useEffect(() => {
    trackEvent("client_step_viewed", { step: 6 });
  }, []);

  useEffect(() => {
    const guardedStep = resolveStepGuard(app.currentStep, 6);
    if (guardedStep !== 6) {
      navigate(`/apply/step-${guardedStep}`, { replace: true });
    }
  }, [app.currentStep, navigate]);

  useEffect(() => {
    if (!app.signatureDate) {
      update({ signatureDate: today });
    }
  }, [app.signatureDate, today, update]);

  useEffect(() => {
    trackEvent("client_step_progressed", { step: 6 });
  }, []);

  useEffect(() => {
    apiCall<{ count?: number }>(API_ENDPOINTS_CONTRACT.PUBLIC.LENDER_COUNT)
      .then((data) => {
        const count = Number(data?.count || 0);
        if (count > 0) setLenderCount(count);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!app.applicationToken!) return;
    ClientAppAPI.status(app.applicationToken!)
      .then((res) => {
        const refreshed = extractApplicationFromStatus(
          res?.data || {},
          app.applicationToken!
        );
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
        });
      })
      .catch(() => {
      });
  }, [app.applicationToken!, update]);

  function toggleTerms() {
    update({ termsAccepted: !app.termsAccepted });
  }

  function toggleInfoConfirmed() {
    update({ infoConfirmed: !app.infoConfirmed });
  }

  function toggleShareAuthorization() {
    update({ shareAuthorization: !app.shareAuthorization });
  }

  function resolveSubmissionId(data: unknown) {
    if (!data || typeof data !== "object") return null;
    const root = data as Record<string, any>;
    const submission =
      root.submission && typeof root.submission === "object"
        ? (root.submission as Record<string, any>)
        : null;
    const application =
      root.application && typeof root.application === "object"
        ? (root.application as Record<string, any>)
        : null;

    return (
      (typeof root.submissionId === "string" && root.submissionId) ||
      (typeof submission?.id === "string" && submission.id) ||
      (typeof submission?.submissionId === "string" && submission.submissionId) ||
      (typeof root.applicationId === "string" && root.applicationId) ||
      (typeof application?.id === "string" && application.id) ||
      (typeof root.id === "string" && root.id) ||
      null
    );
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const blockSubmit = (message: string) => {
      setSubmitError(message);
      setSubmitting(false);
    };

    if (!isOnline) {
      blockSubmit("You're offline. Please reconnect to submit your application.");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      blockSubmit("You're offline. Please reconnect to submit your application.");
      return;
    }

    if (!idempotencyKey) {
      blockSubmit("We couldn't prepare your submission. Please refresh and try again.");
      return;
    }

    if (!app.applicationToken!) {
      blockSubmit("Missing application token. Please restart your application.");
      return;
    }

    if (!app.selectedProductId) {
      blockSubmit("Missing product selection. Please return to Step 2.");
      return;
    }

    if (shouldBlockForMissingDocuments(app)) {
      blockSubmit("Please upload all required documents before submitting.");
      return;
    }

    if (!docsAccepted) {
      blockSubmit("Your required documents must be accepted before you can sign.");
      return;
    }

    if (!processingComplete) {
      blockSubmit("We’re still completing application checks. Please check back shortly.");
      return;
    }

    if (!ocrComplete || !creditSummaryComplete) {
      blockSubmit("We’re still completing application checks. Please check back shortly.");
      return;
    }

    if (!app.typedSignature?.trim()) {
      blockSubmit("Please type your full name to sign.");
      return;
    }

    if (hasPartner && !app.coApplicantSignature?.trim()) {
      blockSubmit("Please enter a signature for each applicant.");
      return;
    }

    if (missingIdDocs.length > 0) {
      blockSubmit("Please upload all required applicant IDs before submitting.");
      return;
    }

    if (!app.termsAccepted) {
      blockSubmit("Please complete all confirmations before submitting.");
      return;
    }

    try {
      await ClientAppAPI.update(app.applicationToken!, {
        financialProfile: app.kyc,
        selectedProduct: app.selectedProduct,
        selectedProductId: app.selectedProductId,
        selectedProductType: app.selectedProductType,
        requires_closing_cost_funding: app.requires_closing_cost_funding,
        business: app.business,
        applicant: app.applicant,
        documents: app.documents,
        documentsDeferred: Boolean(app.documentsDeferred),
        termsAccepted: app.termsAccepted && Boolean(app.infoConfirmed) && Boolean(app.shareAuthorization),
        typedSignature: app.typedSignature,
        coApplicantSignature: app.coApplicantSignature,
        signatureDate: app.signatureDate || today,
        currentStep: app.currentStep,
      });
      assertSubmissionReady(app);
      const payload = buildSubmissionPayload(app);
      const attribution = getClientAttribution();
      trackEvent("client_submission_started");
      trackEvent("client_application_submitted", { step: 6 });
      track("Application Submitted");
      const requestedAmount = parseCurrencyAmount(app.kyc?.fundingAmount);
      const estimatedCommission = estimateClientCommission(requestedAmount);
      const revenueTier =
        estimatedCommission > 15000
          ? "high"
          : estimatedCommission > 5000
            ? "medium"
            : "low";
      trackEvent("application_priority", {
        revenue_tier: revenueTier,
        session_id: getSessionId(),
      });
      const revenue = parseCurrencyAmount(
        app.kyc?.annualRevenue || app.kyc?.revenueLast12Months || app.business?.estimatedRevenue
      );
      const timeInBusiness = (() => {
        const startDate = app.business?.startDate;
        if (!startDate) return 0;
        const start = new Date(startDate);
        if (Number.isNaN(start.getTime())) return 0;
        const now = new Date();
        return Math.max(
          0,
          (now.getFullYear() - start.getFullYear()) * 12 +
            (now.getMonth() - start.getMonth())
        );
      })();
      const creditScore = Number.parseInt(
        String(app.kyc?.creditScore ?? app.applicant?.creditScore ?? ""),
        10
      );
      const qualityTier = calculateApplicationQuality({
        revenue,
        timeInBusiness,
        creditScore: Number.isNaN(creditScore) ? undefined : creditScore,
      });
      const readinessLevel = classifyReadiness();
      trackConversion("application_submitted", {
        requested_amount: requestedAmount,
        estimated_commission_value: estimatedCommission,
        quality_tier: qualityTier,
        underwriting_readiness: readinessLevel,
        estimated_amount: app.kyc?.fundingAmount,
        product_type: app.selectedProductType || app.selectedProduct?.product_type,
        lead_strength: app.readinessScore,
        ...attribution,
      });
      track("submit");
      const submissionResponse = await submitApplication(
        {
          ...payload,
          attribution,
          ...getLeadFingerprint(),
        },
        {
          idempotencyKey,
          continuationToken: app.continuationToken,
        }
      );
      localStorage.removeItem("creditSessionToken");
      const refreshed = await ClientAppAPI.status(app.applicationToken!);
      const hydrated = extractApplicationFromStatus(
        refreshed?.data || {},
        app.applicationToken!
      );
      const nextApplicationId =
        hydrated.applicationId ||
        app.applicationId ||
        refreshed?.data?.applicationId ||
        refreshed?.data?.application?.applicationId ||
        null;
      if (nextApplicationId) {
        await ClientAppAPI.updateApplication(nextApplicationId, {
          status: "requires_docs",
        });
      }
      void submissionResponse;
      trackEvent("client_submission_completed");
      update({
        applicationId: hydrated.applicationId || app.applicationId,
        documents: hydrated.documents || app.documents,
        documentsDeferred:
          typeof hydrated.documentsDeferred === "boolean"
            ? hydrated.documentsDeferred
            : app.documentsDeferred,
        documentReviewComplete:
          hydrated.documentReviewComplete ?? app.documentReviewComplete,
        financialReviewComplete:
          hydrated.financialReviewComplete ?? app.financialReviewComplete,
      });
      if (app.kyc?.phone && app.applicationToken!) {
        ClientProfileStore.markSubmitted(app.kyc.phone, app.applicationToken!);
      }
      clearDraft();
      clearSubmissionIdempotencyKey();
      clearStoredReadinessSession();
      localStorage.removeItem("creditPrefill");
      setTimeout(() => {
        if (nextApplicationId) {
          navigate(`/application/${nextApplicationId}`, { replace: true, state: { submitted: true } });
          return;
        }
        navigate("/portal", { replace: true });
      }, 1200);
    } catch (error: unknown) {
      const response =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { status?: number; data?: Record<string, any> } }).response
          : undefined;
      const status = response?.status;
      const data = response?.data;
      if (status === 409 && resolveSubmissionId(data)) {
        clearDraft();
        clearSubmissionIdempotencyKey();
        clearStoredReadinessSession();
      localStorage.removeItem("creditPrefill");
        setTimeout(() => {
          if (resolveSubmissionId(data)) {
            navigate(`/application/${resolveSubmissionId(data)}`, { replace: true, state: { submitted: true, duplicate: true } });
            return;
          }
          navigate("/portal", { replace: true });
        }, 1200);
        return;
      }
      logError(error, { stage: "submission" });
      setSubmitError("Submission failed. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitError) {
    return (
      <WizardLayout>
        <Card
          style={{
            textAlign: "center",
            padding: tokens.spacing.xl,
            display: "flex",
            flexDirection: "column",
            gap: tokens.spacing.sm,
          }}
        >
          <div style={components.form.eyebrow}>Submission error</div>
          <h1 style={components.form.title}>We couldn’t submit your application</h1>
          <p style={components.form.subtitle}>{submitError}</p>
          <Button
            style={{ marginTop: tokens.spacing.sm, width: "100%", maxWidth: "260px" }}
            onClick={() => setSubmitError(null)}
          >
            Return to review
          </Button>
        </Card>
      </WizardLayout>
    );
  }

  async function handleIdUpload(docType: string, file: File | null) {
    if (!file || !app.applicationToken!) return;

    setDocErrors((prev) => ({ ...prev, [docType]: "" }));

    if (file.size > 15 * 1024 * 1024) {
      setDocErrors((prev) => ({
        ...prev,
        [docType]: "File too large. Max 15 MB.",
      }));
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const fileType = file.type || "";
    const extension = file.name.toLowerCase();
    const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".docx"];
    const validType =
      allowedTypes.includes(fileType) ||
      allowedExtensions.some((ext) => extension.endsWith(ext));

    if (!validType) {
      setDocErrors((prev) => ({
        ...prev,
        [docType]: "Unsupported file type. Allowed: PDF, PNG, JPEG, DOCX.",
      }));
      return;
    }

    try {
      setUploadingDocs((prev) => ({ ...prev, [docType]: true }));
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.onload = () => {
          const result = String(reader.result || "");
          const payload = result.includes(",") ? result.split(",")[1] : result;
          resolve(payload);
        };
        reader.readAsDataURL(file);
      });
      await ClientAppAPI.uploadDoc(app.applicationToken!, {
        documents: {
          [docType]: {
            name: file.name,
            base64,
            productId: app.selectedProductId,
            documentCategory: docType,
          },
        },
      });
      const refreshed = await ClientAppAPI.status(app.applicationToken!);
      const hydrated = extractApplicationFromStatus(
        refreshed?.data || {},
        app.applicationToken!
      );
      update({
        applicationId: hydrated.applicationId || app.applicationId,
        documents: hydrated.documents || app.documents,
        documentReviewComplete:
          hydrated.documentReviewComplete ?? app.documentReviewComplete,
        financialReviewComplete:
          hydrated.financialReviewComplete ?? app.financialReviewComplete,
      });
      const uploadedDocs = hydrated.documents || app.documents;
      incrementUnderwritingScore(2);

      if (!hasTrackedFirstDocumentUpload.current) {
        hasTrackedFirstDocumentUpload.current = true;
        const timeToFirstDoc = Date.now() - firstDocStartTime.current;
        trackEvent("time_to_first_document", {
          ms: timeToFirstDoc,
        });
      }

      trackEvent("document_uploaded", {
        category: docType,
        readiness_level: classifyReadiness(),
      });

      const requiredDocsUploaded =
        app.documentsDeferred ||
        requiredDocTypes.length === 0 ||
        requiredDocTypes.every((requiredDocType) => uploadedDocs[requiredDocType]);

      if (requiredDocsUploaded && !hasTrackedUnderwritingPackageReady.current) {
        hasTrackedUnderwritingPackageReady.current = true;
        incrementUnderwritingScore(4);
        trackEvent("underwriting_package_ready", {
          readiness_level: classifyReadiness(),
        });
      }

      setDocErrors((prev) => ({ ...prev, [docType]: "" }));
      track("document_uploaded");
    } catch {
      setDocErrors((prev) => ({
        ...prev,
        [docType]: "ID upload failed. Please try again.",
      }));
    } finally {
      setUploadingDocs((prev) => ({ ...prev, [docType]: false }));
    }
  }

  return (
    <WizardLayout>
      <StepHeader step={6} title="Terms & Conditions + Typed Signature" />

      <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}>
        <div>
          <h2 style={components.form.sectionTitle}>Applicant IDs</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.sm }}>
            {idRequirements
              .filter((entry) => entry.required)
              .map((entry) => {
                const docError = docErrors[entry.key];
                const isUploading = uploadingDocs[entry.key];
                const docStatus = app.documents[entry.key]?.status;
                return (
                  <FileUploadCard
                    key={entry.key}
                    title={entry.label}
                    status={isUploading ? "Uploading" : docStatus || "missing"}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const file = event.dataTransfer.files?.[0] || null;
                      handleIdUpload(entry.key, file);
                    }}
                  >
                    <input
                      id={`id-doc-${entry.key}`}
                      type="file"
                      style={{ display: "none" }}
                      onChange={(e: unknown) =>
                        handleIdUpload(entry.key, e.target.files?.[0] || null)
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isUploading}
                      loading={isUploading}
                      onClick={() =>
                        document.getElementById(`id-doc-${entry.key}`)?.click()
                      }
                      style={{ width: "100%" }}
                    >
                      Upload ID
                    </Button>
                    {app.documents[entry.key] && (
                      <div style={components.form.helperText}>
                        Uploaded: {app.documents[entry.key].name}
                      </div>
                    )}
                    {docError && (
                      <div style={components.form.errorText}>{docError}</div>
                    )}
                    {!docError && !app.documents[entry.key] && (
                      <div style={components.form.errorText}>
                        This ID is required.
                      </div>
                    )}
                    {docStatus === "rejected" && (
                      <div style={components.form.errorText}>
                        ID rejected. Please upload a new file.
                      </div>
                    )}
                  </FileUploadCard>
                );
              })}
          </div>
        </div>

        {(!docsAccepted || !processingComplete) && (
          <Card
            variant="muted"
            data-error={true}
            style={{ background: "rgba(245, 158, 11, 0.12)" }}
          >
            <div style={layout.stackTight}>
              {!docsAccepted && (
                <div style={components.form.errorText}>
                  Required documents must be accepted before you can sign.
                </div>
              )}
              {!processingComplete && (
                <div style={components.form.errorText}>
                  Your application checks are still running.
                </div>
              )}
            </div>
          </Card>
        )}

        <div>
          <h2 style={components.form.sectionTitle}>Terms & Conditions</h2>
          <div
            style={{
              background: tokens.colors.background,
              padding: tokens.spacing.md,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radii.lg,
              fontSize: tokens.typography.body.fontSize,
              color: tokens.colors.textSecondary,
              whiteSpace: "pre-line",
              marginTop: tokens.spacing.xs,
            }}
          >
            {TERMS_TEXT}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: tokens.spacing.md,
          }}
        >
          <div style={layout.stackTight}>
            <label style={components.form.label}>Typed signature</label>
            <Input
              placeholder="Type your full legal name"
              value={app.typedSignature || ""}
              onChange={(e: unknown) => update({ typedSignature: e.target.value })}
            />
            <p style={components.form.helperText}>
              By typing your name, you are providing a legally binding signature.
            </p>
          </div>

          {hasPartner && (
            <div style={layout.stackTight}>
              <label style={components.form.label}>Business partner signature</label>
              <Input
                placeholder="Type full legal name"
                value={app.coApplicantSignature || ""}
                onChange={(e: unknown) =>
                  update({ coApplicantSignature: e.target.value })
                }
              />
              <p style={components.form.helperText}>
                All applicants listed in the application must sign.
              </p>
            </div>
          )}

          <div style={layout.stackTight}>
            <label style={components.form.label}>Date</label>
            <Input value={app.signatureDate || today} readOnly />
          </div>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: tokens.spacing.xs,
            fontSize: tokens.typography.label.fontSize,
            fontWeight: tokens.typography.label.fontWeight,
            color: tokens.colors.textPrimary,
          }}
        >
          <Checkbox checked={Boolean(app.infoConfirmed)} onChange={toggleInfoConfirmed} />
          <span>I confirm the information is accurate</span>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: tokens.spacing.xs,
            fontSize: tokens.typography.label.fontSize,
            fontWeight: tokens.typography.label.fontWeight,
            color: tokens.colors.textPrimary,
          }}
        >
          <Checkbox checked={Boolean(app.shareAuthorization)} onChange={toggleShareAuthorization} />
          <span>I authorize Boreal Financial to share my application with lenders</span>
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: tokens.spacing.xs,
            fontSize: tokens.typography.label.fontSize,
            fontWeight: tokens.typography.label.fontWeight,
            color: tokens.colors.textPrimary,
          }}
        >
          <Checkbox checked={app.termsAccepted} onChange={toggleTerms} />
          <span>I agree to the Terms & Conditions</span>
        </label>

        {typeof app.readinessScore === "number" && (
          <div style={components.form.helperText}>
            Your capital readiness score: {app.readinessScore} / 100
          </div>
        )}

        <div style={components.form.helperText}>
          Submitted to our network of {lenderCount ? `${lenderCount}+` : "40+"} lenders
        </div>

        <div style={layout.stickyCta}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: tokens.spacing.sm }}>
            <Button
              variant="secondary"
              style={{ width: "100%", maxWidth: "160px" }}
              onClick={() => navigate("/apply/step-5")}
            >
              ← Back
            </Button>
            <Button
              style={{ width: "100%", maxWidth: "240px" }}
              onClick={submit}
              disabled={
                submitting ||
                !canSubmitApplication({
                  isOnline,
                  hasIdempotencyKey: Boolean(idempotencyKey),
                  hasApplicationToken: Boolean(app.applicationToken!),
                  hasSelectedProductId: Boolean(app.selectedProductId),
                  termsAccepted: app.termsAccepted && Boolean(app.infoConfirmed) && Boolean(app.shareAuthorization),
                  typedSignature: Boolean(app.typedSignature?.trim()),
                  partnerSignature: hasPartner ? Boolean(app.coApplicantSignature?.trim()) : true,
                  missingIdDocs: missingIdDocs.length,
                  missingRequiredDocs: missingRequiredDocs.length,
                  docsAccepted,
                  ocrComplete,
                  creditSummaryComplete,
                  documentsDeferred: Boolean(app.documentsDeferred),
                })
              }
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>
      </Card>
    </WizardLayout>
  );
}

export default Step6_Review;
