// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApplicationStore } from "../state/useApplicationStore";
import { ACCORD_RISK_QUESTIONS, isAccordLOCApp } from "./accordRisk";
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
import { savePendingSubmit, clearPendingSubmit, subscribeRetry } from "../state/pendingSubmit";
import { sendSubmitAttempt } from "../utils/submitAttempt"; // BF_CLIENT_BLOCK_v872

// BF_CLIENT_BLOCK_v721_TC_CLAUSES_v1 — full Terms & Conditions text shown in popups.
// (Legal text supplied by Boreal; review with counsel. Province = Alberta placeholder.)
const TC_CLAUSES: Array<{ title: string; blocks: Array<{ p?: string; ul?: string[] }> }> = [
  {
    title: "Electronic Communications Risk Acknowledgement",
    blocks: [
      { p: "I/We acknowledge and accept the risks associated with electronic communications and electronic transmission of information. I/We understand that communications transmitted by email, SMS/text message, web portals, online applications, electronic document systems, client messaging systems, mobile applications, or other electronic means may be intercepted, delayed, lost, altered, corrupted, misdirected, impersonated, or accessed by unauthorized parties." },
      { p: "I/We understand that Boreal Financial Corp., its affiliates, related entities, employees, contractors, representatives, lender partners, service providers, and technology providers cannot guarantee the security, confidentiality, delivery, or uninterrupted operation of electronic communications or electronic systems." },
      { p: "To the fullest extent permitted by law, I/We release and hold harmless Boreal Financial Corp., its affiliates, related entities, employees, contractors, representatives, lender partners, and service providers from any loss, damage, claim, cost, liability, or expense arising from the use of electronic communications, electronic signatures, electronic document transmission, electronic storage, online portals, client messaging systems, or related technologies." },
    ],
  },
  {
    title: "Consent to Collect, Use, Verify, and Share Information",
    blocks: [
      { p: "I/We authorize Boreal Financial Corp., its affiliates, subsidiaries, parent companies, related entities, operating divisions, employees, contractors, representatives, lender partners, investors, insurers, credit reporting agencies, financial institutions, service providers, professional advisors, and other parties involved in evaluating, arranging, underwriting, servicing, or administering financing transactions to collect, verify, use, disclose, exchange, transmit, and retain personal information, business information, financial information, banking information, credit information, application information, supporting documents, and any other information provided in connection with this application." },
      { p: "I/We further authorize Boreal Financial Corp. to share such information with any current or prospective lender, funding source, investor, insurer, service provider, referral partner, credit reporting agency, governmental authority, compliance provider, fraud prevention provider, or any other party reasonably required to facilitate, evaluate, arrange, administer, monitor, service, or complete a financing transaction." },
      { p: "I/We certify that all information supplied is true, accurate, and complete to the best of my/our knowledge. I/We understand that Boreal Financial Corp. may rely upon this information and may conduct reasonable verification procedures, including identity verification, business verification, credit inquiries, banking verification, fraud prevention reviews, and related due diligence activities." },
      { p: "I/We acknowledge that Boreal Financial Corp. may receive commissions, fees, referral compensation, lender-paid compensation, or other remuneration in connection with financing transactions and that Boreal Financial Corp. does not guarantee approval, funding, rates, terms, conditions, lender participation, or financing availability." },
      { p: "I/We represent and warrant that the individual submitting this application is duly authorized to provide these consents and authorizations on behalf of the business and on behalf of all owners, principals, shareholders, directors, officers, and proposed guarantors identified in this application." },
      { p: "I/We acknowledge that personal information is collected, used, retained, and disclosed in accordance with Boreal Financial Corp.'s Privacy Policy, and that such information will be retained only as long as reasonably necessary for the purposes described or as required by law." },
      { p: "This authorization and any resulting financing relationship are governed by the laws of the Province of Alberta and the federal laws of Canada applicable therein, without regard to conflict-of-laws principles." },
    ],
  },
  {
    title: "Communication Consent (Email, SMS, Phone, Portal, and Client Messaging)",
    blocks: [
      { p: "I/We expressly authorize Boreal Financial Corp., its affiliates, related entities, employees, contractors, representatives, lender partners, service providers, and authorized third parties to communicate with me/us regarding this application, any related financing transaction, account administration, document requests, underwriting matters, servicing matters, marketing opportunities, and other business-related communications." },
      { p: "This authorization includes communication through:" },
      { ul: ["Email", "SMS/Text Messages", "Telephone Calls", "Voicemail Messages", "Automated Calling Systems", "Client Portal Notifications", "In-Application Messaging", "Boreal Financial Client-to-Staff Messaging Systems", "Secure Document Portals", "Electronic Signature Platforms", "Other electronic communication methods provided now or in the future"] },
      { p: "This consent applies to all email addresses, telephone numbers, messaging accounts, portal accounts, and contact information provided now or in the future. I/We understand that message and data rates may apply and that electronic communications may not always be secure." },
      { p: "I/We agree that electronic records, electronic communications, electronic acknowledgements, and electronic signatures shall have the same legal force and effect as original written documents and handwritten signatures." },
      { p: "I/We may withdraw consent for commercial electronic messages or marketing communications at any time by using the unsubscribe mechanism provided in those messages or by contacting Boreal Financial Corp. directly. Withdrawing marketing consent will not affect communications reasonably necessary to administer or service an active application or financing transaction." },
    ],
  },
];

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
  // BF_CLIENT_BLOCK_v721_TC_CLAUSES_v1 — which consent popup is open
  const [openClause, setOpenClause] = useState<number | null>(null);
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
      // BF_CLIENT_BLOCK_v328 — submit gate requires Stage-1 docs only. Stage-2
      // items (Flinks bank-connect, CRA auth) are forms collected later in the
      // mini-portal and must never block submit. Matches getMissingRequiredDocs.
      .filter((entry) => entry.required && entry.stage === 1)
      // BF_CLIENT_BLOCK_v713_SUBMIT_GATE_NO_CMP_FORMS_v1 — exclude all CMP forms (see submission.ts).
      .filter((entry) => !/net worth|flinks|banking connection|connect bank|\bcra\b|debt|real estate|equipment|professional advisor|\badvisor/i.test(String(entry.document_type ?? "")))
      .map((entry) => entry.document_type);
  }, [app.kyc?.fundingAmount, app.productRequirements, requirementsKey]);
  const missingRequiredDocs = useMemo(() => getMissingRequiredDocs(app), [app]);
  // BF_CLIENT_BLOCK_v82_SUBMIT_GATE_RELAX — the previous gate required
  // staff to have already clicked "Accept" on every document AND for the
  // server-side OCR + banking + credit summary workers to have completed
  // before Submit was enabled. That's not the workflow — those steps
  // happen post-submit, on the staff side. The applicant submits when
  // they've uploaded their docs and signed.
  const docsPresent = useMemo(() => {
    if (app.documentsDeferred) return true;
    if (requiredDocTypes.length === 0) return true;
    return requiredDocTypes.every((docType) => {
      const doc = app.documents[docType];
      // Anything except missing/rejected counts as ready for submit.
      return Boolean(doc) && doc.status !== "rejected";
    });
  }, [app.documents, app.documentsDeferred, requiredDocTypes]);
  // Kept under the old names so nothing downstream breaks.
  const docsAccepted = docsPresent;
  const processingComplete = true;
  const ocrComplete = true;
  const creditSummaryComplete = true;
  // BF_CLIENT_BLOCK_v156_DOC_SOURCE_OF_TRUTH_v1 — dead idRequirements/missingIdDocs removed.

  // BF_CLIENT_BLOCK_v316_SUBMIT_RETRY_UX_v1 — auto-navigate when the
  // background retry succeeds. Without this, after submit fails the
  // user stays on the "submitting" card forever even though the
  // application has actually gone through.
  useEffect(() => {
    const unsub = subscribeRetry((evt) => {
      if (evt.type === "succeeded") {
        try { clearDraft(); } catch {}
        try { clearSubmissionIdempotencyKey(); } catch {}
        try { clearStoredReadinessSession(); } catch {}
        try { localStorage.removeItem("creditPrefill"); } catch {}
        navigate("/portal", { replace: true, state: { submitted: true } });
      }
    });
    return unsub;
  }, [navigate]);
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

  // BF_CLIENT_BLOCK_v721_TC_CLAUSES_v1 — clause N -> gate key (all three required to submit)
  const tcConsents = [
    { get: () => Boolean(app.termsAccepted), toggle: toggleTerms },
    { get: () => Boolean(app.shareAuthorization), toggle: toggleShareAuthorization },
    { get: () => Boolean(app.infoConfirmed), toggle: toggleInfoConfirmed },
  ];

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
    // BF_CLIENT_BLOCK_v105_SUBMIT_UNBLOCK_v1 — visible click ack + outer guard
    console.info("[wizard] Step6 submit() invoked", {
      applicationToken: app.applicationToken,
      hasSig: Boolean(app.typedSignature?.trim()),
      docsDeferred: Boolean(app.documentsDeferred),
    });
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    sendSubmitAttempt(app, "attempted"); // BF_CLIENT_BLOCK_v872

    const blockSubmit = (message: string) => {
      setSubmitError(message);
      setSubmitting(false);
    };

    // BF_CLIENT_BLOCK_v102_OFFLINE_GATE_v1
    // Single isOnline check (always true post-v96; reflects useNetworkStatus's
    // optimistic-online policy because navigator.onLine is unreliable on Wi-Fi
    // transitions / captive portals / SW boot). The redundant raw
    // navigator.onLine fallback that lived here was the actual reason real
    // submits returned "you're offline" while the network was fine.
    if (!isOnline) {
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

    // BF_CLIENT_BLOCK_v82_SUBMIT_GATE_RELAX — only block on actual user
    // input gaps; do not block on staff-side acceptance or async workers.
    if (shouldBlockForMissingDocuments(app)) {
      blockSubmit("Please upload all required documents, or choose 'I will supply documents later'.");
      return;
    }
    if (!docsPresent) {
      blockSubmit("One or more documents was rejected. Please re-upload before submitting.");
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
      // BF_CLIENT_BLOCK_v865_ANALYTICS_NEVER_BLOCK_SUBMIT — attribution and
      // analytics are non-essential and must NEVER abort submission. A throw
      // here (e.g. blocked localStorage in a corporate/private browser) used to
      // land the client on the false "we've got it" screen with the POST never
      // sent. Capture attribution defensively and isolate all tracking.
      let attribution: Record<string, any> = {};
      try {
        attribution = getClientAttribution() || {};
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
          app.kyc?.annualRevenue ||
            app.kyc?.revenueLast12Months ||
            app.business?.estimatedRevenue
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
      } catch (analyticsErr) {
        // eslint-disable-next-line no-console
        console.warn("[submit] non-essential analytics skipped:", analyticsErr);
      }
      // BF_LOCAL_FIRST_v35 — Block 35: stale-token-resilient submit.
      // If the local applicationToken no longer exists server-side
      // (404 / application_not_found), mint a fresh one and retry once.
      // The full payload lives in the submit() body so server-side state
      // doesn't need to have anything pre-populated.
      // BF_CLIENT_v71_BLOCK_3_4 — ensure wizard submit always flows through buildSubmitBody normalizers.
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
        try {
          localStorage.setItem("bf_application_token", fresh);
        } catch {
          /* BF_CLIENT_BLOCK_v865_STORAGE_SAFE */
        }
        update({ applicationToken: fresh, applicationId: fresh });
        submissionResponse = await ClientAppAPI.submit(fresh, submitBody);
      }
      try { localStorage.removeItem("creditSessionToken"); } catch { /* BF_CLIENT_BLOCK_v865_STORAGE_SAFE */ }
      clearPendingSubmit(); // BF_LOCAL_FIRST_v35
      sendSubmitAttempt(app, "completed"); // BF_CLIENT_BLOCK_v872
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
      // BF_CLIENT_BLOCK_v105_SUBMIT_UNBLOCK_v1 — surface real submit errors.
      console.error("[wizard] Step6 submit() failed", error);
      const response =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { status?: number; data?: Record<string, any> } }).response
          : undefined;
      const status = response?.status;
      const data = response?.data;
      if (status === 409 && resolveSubmissionId(data)) {
        sendSubmitAttempt(app, "completed"); // BF_CLIENT_BLOCK_v872 — duplicate = already submitted
        clearDraft();
        clearSubmissionIdempotencyKey();
        clearStoredReadinessSession();
        try { localStorage.removeItem("creditPrefill"); } catch { /* BF_CLIENT_BLOCK_v865_STORAGE_SAFE */ }
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
      sendSubmitAttempt(app, "failed", error instanceof Error ? error.message : String(error)); // BF_CLIENT_BLOCK_v872
      // BF_CLIENT_BLOCK_v872_NO_FALSE_SUCCESS — never claim success on a failed
      // submit. A failure that looks successful makes the applicant leave, and
      // the retry outbox is local to this device only, so the application can be
      // lost. Be honest and give a real retry.
      setSubmitError(
        "We couldn't finish submitting your application. Please tap Try Again. " +
        "Your information is saved on this device, so you won't lose anything."
      );
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
          <div style={components.form.eyebrow}>Submission incomplete</div>
          <h1 style={components.form.title}>We couldn't submit your application</h1>
          <p style={components.form.subtitle}>{submitError}</p>
          <Button
            style={{ marginTop: tokens.spacing.sm, width: "100%", maxWidth: "260px" }}
            onClick={() => { setSubmitError(null); void submit(); }}
          >
            Try Again
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

  // BF_CLIENT_BLOCK_v_WIZARD_DIRECTION_A_FINISH_v1 — removed duplicate shell/heading.
  return (
    <>
        <style>{`.wizard-step-shell label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px}.wizard-step-shell input,.wizard-step-shell select{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;box-sizing:border-box}.wizard-step-shell select{appearance:none;cursor:pointer}`}</style>
    <WizardLayout>
      <div className="wizard-step-shell">
      <StepHeader step={6} title="Terms & Conditions + Typed Signature" subtitle="Check everything is right. You can edit any section before submitting." />

      {/* BF_CLIENT_BLOCK_v327 — Accord Risk Profile moved here from Step 3 (top of Step 6). */}
      {isAccordLOCApp(app) && (
        <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.md, marginBottom: tokens.spacing.lg }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: 0 }}>Risk Profile</h2>
          <div style={{ display: "grid", gridTemplateColumns: typeof window !== "undefined" && window.innerWidth < 600 ? "1fr" : "1fr 1fr", gap: tokens.spacing.md }}>
            {ACCORD_RISK_QUESTIONS.map((q) => {
              const biz = (app.business ?? {}) as Record<string, any>;
              const val = biz[q.key] ?? "";
              const detail = biz[`${q.key}Detail`] ?? "";
              const setVal = (v: string) => update({ business: { ...biz, [q.key]: v } as any });
              const setDetail = (v: string) => update({ business: { ...biz, [`${q.key}Detail`]: v } as any });
              return (
                <div key={q.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>{q.label}</label>
                  <select value={val} onChange={(e) => setVal(e.target.value)}>
                    <option value="">Select…</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  {val === "Yes" && (
                    <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Please provide details" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}>
        {/* BF_CLIENT_WIZARD_STEP6_PGI_v61 — Step 6 reordered to
          PGI → T&C → consent checkboxes → signature → submit.
          Personal Guarantee Insurance is captured as an optional
          preference (app.pgiOptIn = "yes" | "no" | undefined). It does
          not block submit, has no separate T&C, and is mirrored into
          the existing submit payload under metadata. The signature
          grid now lives AFTER the consent checkboxes so the user
          signs LAST. v60 anchor was: BF_CLIENT_WIZARD_STEP6_NOIDS_v60. */}

        {(!docsPresent && !app.documentsDeferred) && (
          <Card variant="muted" data-error={true}>
            <div style={{ fontWeight: 600 }}>One or more documents needs attention</div>
            <div style={components.form.helperText}>
              Please return to Step 5 and re-upload any rejected documents, or choose
              "I will supply documents later".
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
          <p style={{ fontSize: tokens.typography.body.fontSize, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs }}>
            Please review and accept each of the following. Select "View full terms" to read the complete text of each.
          </p>
        </div>

        {/* BF_CLIENT_BLOCK_v721_TC_CLAUSES_v1 — three required consents, each with a popup */}
        {TC_CLAUSES.map((clause, i) => (
          <label
            key={clause.title}
            style={{ display: "flex", alignItems: "flex-start", gap: tokens.spacing.xs, fontSize: tokens.typography.label.fontSize, fontWeight: tokens.typography.label.fontWeight, color: tokens.colors.textPrimary }}
          >
            <Checkbox checked={tcConsents[i].get()} onChange={tcConsents[i].toggle} />
            <span>
              {clause.title}{" "}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setOpenClause(i); }}
                style={{ background: "none", border: "none", padding: 0, color: tokens.colors.primary, textDecoration: "underline", cursor: "pointer", fontSize: "inherit" }}
              >
                View full terms
              </button>
            </span>
          </label>
        ))}

        {openClause !== null && (
          <div
            onClick={() => setOpenClause(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 1000 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#ffffff", color: "#111827", borderRadius: 12, maxWidth: 640, width: "100%", maxHeight: "80vh", overflowY: "auto", padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginTop: 0, marginBottom: 12 }}>{TC_CLAUSES[openClause].title}</h3>
              {TC_CLAUSES[openClause].blocks.map((b, j) =>
                b.ul ? (
                  <ul key={j} style={{ color: "#111827", fontSize: 14, lineHeight: 1.6, paddingLeft: 20, margin: "0 0 12px" }}>
                    {b.ul.map((it) => (<li key={it}>{it}</li>))}
                  </ul>
                ) : (
                  <p key={j} style={{ color: "#111827", fontSize: 14, lineHeight: 1.6, margin: "0 0 12px" }}>{b.p}</p>
                )
              )}
              <button
                type="button"
                onClick={() => setOpenClause(null)}
                style={{ marginTop: 8, padding: "10px 20px", background: "#0b1320", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        )}

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
    </>
  );
}

export default Step6_Review;
