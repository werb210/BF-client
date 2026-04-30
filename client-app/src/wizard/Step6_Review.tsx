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
// BF_CLIENT_WIZARD_STEP6_IMPORT_v59 — Step 6 references
// API_ENDPOINTS_CONTRACT.PUBLIC.LENDER_COUNT at runtime but the import
// was missing. In production this threw ReferenceError on Step 6 mount,
// blocking the user with "Application Error / A fatal error occurred."
// after Step 5. The lender-count fetch is wrapped in .catch() so even
// when the endpoint 404s the page still renders — but only if the
// symbol is at least defined.
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import { clearStoredReadinessSession } from "@/api/website";
import { parseCurrencyAmount } from "./productSelection";
import { logError } from "@/lib/logger";
import { buildSubmitBody } from "@/lib/payload/buildSubmitBody";
import { normalizeForSubmit } from "./submitNormalize";
import { savePendingSubmit, clearPendingSubmit } from "../state/pendingSubmit";

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- BF_STEP_RESET_NORACE_v37 (Block 37) — running on every currentStep change caused unmounting step to reset back, fighting next step’s mount effect

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

  // BF_CLIENT_v66_STATUS_NO_LOOP — see Step5_Documents for full rationale.
  // The server's /status endpoint does not currently return these fields;
  // writing the extractApplicationFromStatus defaults back into app state
  // was producing dozens of /status calls per visit to Step 6.
  useEffect(() => {
    if (!app.applicationToken!) return;
    ClientAppAPI.status(app.applicationToken!)
      .then(() => {
        // Successful status check; nothing to apply until the server
        // returns review-state fields. The presence of a 200 here is
        // enough to confirm the application id is still valid.
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

    // BF_CLIENT_WIZARD_STEP6_NOIDS_v60 — applicant photo IDs moved to
    // Step 5, where they participate in the existing "Supply Documents
    // Later" deferral flow. Step 6 no longer blocks submission on
    // missing photo IDs; the missingIdDocs check that lived here was
    // removed.

    if (!app.termsAccepted) {
      blockSubmit("Please complete all confirmations before submitting.");
      return;
    }

    // BF_LOCAL_FIRST_v35 — Block 35: pre-submit PATCH removed. The full
    // payload is sent in the ClientAppAPI.submit() call below. Keeping a
    // separate PATCH here was the source of the stale-token 500/410 flood.
    try {
      assertSubmissionReady(app);
      const payload = buildSubmissionPayload(app);
      const normalizedPayload = normalizeForSubmit(app);
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
      // BF_LOCAL_FIRST_v35 — Block 35: stale-token-resilient submit.
      // If the local applicationToken no longer exists server-side
      // (404 / application_not_found), mint a fresh one and retry once.
      // The full payload lives in the submit() body so server-side state
      // doesn't need to have anything pre-populated.
      const submitBody = buildSubmitBody({
        app: {
          ...app,
          ...payload,
          attribution,
          ...getLeadFingerprint(),
        },
      });
      submitBody.normalized = { ...submitBody.normalized, ...normalizedPayload };
      let submissionResponse: any;
      try {
        submissionResponse = await ClientAppAPI.submit(app.applicationToken!, submitBody);
      } catch (submitErr: any) {
        const status = Number(submitErr?.status ?? submitErr?.response?.status ?? 0);
        const code = String(submitErr?.code ?? submitErr?.body?.code ?? "");
        const stale = status === 404 || status === 410 || code === "application_token_stale" || code === "application_not_found";
        if (!stale) throw submitErr;
        // Re-mint and retry once.
        console.warn("[submit] stale applicationToken; re-minting and retrying", { status, code });
        const apiBase = (import.meta as any).env?.VITE_API_BASE_URL
          ?? (typeof window !== "undefined" ? "https://server.boreal.financial" : "");
        const mintRes = await fetch(`${apiBase}/api/public/application/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });
        if (!mintRes.ok) throw submitErr;
        const mintJson = await mintRes.json().catch(() => ({}));
        const fresh = String(
          mintJson?.data?.applicationId ?? mintJson?.applicationId ?? ""
        );
        if (!fresh) throw submitErr;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("bf_application_token", fresh);
        }
        update({ applicationToken: fresh, applicationId: fresh });
        submissionResponse = await ClientAppAPI.submit(fresh, submitBody);
      }
      localStorage.removeItem("creditSessionToken");
      clearPendingSubmit(); // BF_LOCAL_FIRST_v35
      // BF_CLIENT_v63_SUBMIT_HYDRATE_GUARD
      // Server has GET /api/client/application/:id/status (singular, with
      // /status suffix). The client's ClientAppAPI.status hits
      // /api/client/applications/{token} which does NOT exist and 404s.
      // The submit POST itself already returned 200; hydration is opportunistic.
      // Never let a hydration error masquerade as a submit failure.
      let refreshed: any = null;
      let hydrated: any = {};
      try {
        refreshed = await ClientAppAPI.status(app.applicationToken!);
        hydrated = extractApplicationFromStatus(
          refreshed?.data || {},
          app.applicationToken!
        );
      } catch (hydrateErr) {
        // eslint-disable-next-line no-console
        console.warn("[wizard] post-submit hydrate skipped (non-fatal):", hydrateErr);
      }
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
      // BF_CLIENT_v66_SUBMIT_PHONE_FALLBACK — app.kyc.phone is only
      // populated when the wizard prefilled from a readiness check or
      // creditPrefill. For users who started fresh, the phone lives at
      // app.applicant.phone (Step 4). Without this fallback, getBootRoute
      // routes the user back to step 1 next time they OTP in instead of
      // /portal, because hasSubmittedProfile() never sees the marker.
      const submittedPhone =
        (app.kyc?.phone || app.applicant?.phone || "").toString().trim();
      if (submittedPhone && app.applicationToken!) {
        ClientProfileStore.markSubmitted(submittedPhone, app.applicationToken!);
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
      // BF_LOCAL_FIRST_v35 — outbox: persist the full submit payload so
      // the auto-retry watcher can re-attempt on online/interval/boot.
      try {
        if (app?.applicationToken) {
          savePendingSubmit(app.applicationToken, {
            app: { ...app, ...buildSubmissionPayload(app), ...getLeadFingerprint() },
            normalized: normalizeForSubmit(app),
          });
        }
      } catch (outboxErr) {
        console.debug("[submit] outbox save failed", outboxErr);
      }
      logError(error, { stage: "submission" });
      setSubmitError("Submission failed. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitError) {
    return (
      <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "0 0 48px" }}>
        <div style={{ height: 4, background: "#e5e7eb", width: "100%" }}>
          <div style={{ height: 4, background: "#2563eb", width: `${(6 / 6) * 100}%`, transition: "width 0.3s ease" }} />
        </div>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 0" }}>
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
      </div>
      </div>
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
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "0 0 48px" }}>
      <div style={{ height: 4, background: "#e5e7eb", width: "100%" }}>
        <div style={{ height: 4, background: "#2563eb", width: `${(6 / 6) * 100}%`, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 0" }}>
        <h1 style={{ color: "#2563eb", fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Step 6: Terms & Signature</h1>
        <p style={{ color: "#6b7280", textAlign: "center", marginBottom: 32, fontSize: 15 }}>Review terms and sign your application.</p>
        <style>{`.wizard-step-shell label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px}.wizard-step-shell input,.wizard-step-shell select{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;box-sizing:border-box}.wizard-step-shell select{appearance:none;cursor:pointer}`}</style>
    <WizardLayout>
      <div className="wizard-step-shell">
      <StepHeader step={6} title="Terms & Conditions + Typed Signature" />

      <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}>
        {/* BF_CLIENT_WIZARD_STEP6_PGI_v61 — Step 6 reordered to
          PGI → T&C → consent checkboxes → signature → submit.
          Personal Guarantee Insurance is captured as an optional
          preference (app.pgiOptIn = "yes" | "no" | undefined). It does
          not block submit, has no separate T&C, and is mirrored into
          the existing submit payload under metadata. The signature
          grid now lives AFTER the consent checkboxes so the user
          signs LAST. v60 anchor was: BF_CLIENT_WIZARD_STEP6_NOIDS_v60. */}

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

        {/* PGI question — Personal Guarantee Insurance */}
        <div data-testid="step6-pgi-section">
          <h2 style={components.form.sectionTitle}>Personal Guarantee Insurance (PGI)</h2>
          <p style={{ ...components.form.helperText, marginTop: tokens.spacing.xs }}>
            Most lenders require a personal guarantee — meaning you are personally responsible if the business cannot repay. Personal Guarantee Insurance protects you if that happens.
          </p>
          <div style={{ ...layout.stackTight, marginTop: tokens.spacing.sm }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: tokens.spacing.xs, fontSize: tokens.typography.label.fontSize, color: tokens.colors.textPrimary, cursor: "pointer" }}>
              <input type="radio" name="pgi-opt-in" value="yes" checked={app.pgiOptIn === "yes"} onChange={() => update({ pgiOptIn: "yes" })} style={{ width: "auto", marginTop: 4 }} />
              <span>Yes, send me PGI details with my offers</span>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: tokens.spacing.xs, fontSize: tokens.typography.label.fontSize, color: tokens.colors.textPrimary, cursor: "pointer" }}>
              <input type="radio" name="pgi-opt-in" value="no" checked={app.pgiOptIn === "no"} onChange={() => update({ pgiOptIn: "no" })} style={{ width: "auto", marginTop: 4 }} />
              <span>No, I will proceed without PGI</span>
            </label>
          </div>
          <details style={{ marginTop: tokens.spacing.sm }}>
            <summary style={{ cursor: "pointer", color: tokens.colors.textSecondary, fontSize: tokens.typography.body.fontSize }}>
              Learn more about PGI
            </summary>
            <p style={{ ...components.form.helperText, marginTop: tokens.spacing.xs }}>
              PGI is an optional insurance product that covers your personal guarantee obligation if your business defaults on the loan. Premiums vary by loan size, term, and credit profile, typically 1–3% of the loan amount. If you opt in, lenders will quote PGI alongside their loan offers; you can still decline at the offer stage. Coverage and pricing are determined by the insurer, not Boreal Financial.
            </p>
          </details>
        </div>

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

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              typeof window !== "undefined" && window.innerWidth < 600
                ? "1fr"
                : "1fr 1fr",
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
                  // BF_CLIENT_WIZARD_STEP6_NOIDS_v60 — photo IDs moved
                  // to Step 5; never block submit on them here.
                  missingIdDocs: 0,
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
      </div>
    </WizardLayout>
    </div>
    </div>
  );
}

export default Step6_Review;
