// BF_CLIENT_WIZARD_URL_SOT_v56_WIZARD_ANCHOR
// BF_CLIENT_BLOCK_v75_FORMS_AUTH_AND_SLIM_HEADER_v1 — legacy SlimHeader block superseded.
// De-minified for legibility. Behavior unchanged: same URL-driven step routing,
// same OfflineStore token fallback, same Step1 redirect when no token.
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApplicationStore } from "@/state/useApplicationStore";
import { OfflineStore } from "@/state/offline";
import Step1 from "@/wizard/Step1_FinancialProfile";
import Step2 from "@/wizard/Step2_ProductCategory";
import Step3 from "@/wizard/Step3_BusinessDetails";
import Step4 from "@/wizard/Step4_ApplicantInformation";
import Step5 from "@/wizard/Step5_Documents";
import Step6 from "@/wizard/Step6_TermsSignature";
import { ClientAppAPI } from "@/api/clientApp"; // BF_CLIENT_STEP_PERSIST_v183
import { trackEvent } from "@/utils/analytics";

const STEP_COMPONENTS = [Step1, Step2, Step3, Step4, Step5, Step6];
const STEP_PATTERN = /\/apply\/step-(\d+)\b/i;

const clampStep = (n: number): number =>
  !Number.isFinite(n) ? 1 : n < 1 ? 1 : n > 6 ? 6 : Math.floor(n);

export default function Wizard() {
  const { app, update } = useApplicationStore();
  // BF_CLIENT_STEP_PERSIST_v183 - guards against re-sending the same step when
  // the component re-renders for an unrelated reason.
  const lastPersistedStep = useRef<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const stepFromUrl = useMemo<number | null>(() => {
    const m = location.pathname.match(STEP_PATTERN);
    if (!m || !m[1]) return null;
    const n = Number(m[1]);
    return n >= 1 && n <= 6 ? n : null;
  }, [location.pathname]);

  const effectiveStep = clampStep(stepFromUrl ?? app.currentStep ?? 1);

  useEffect(() => {
    if (stepFromUrl == null || app.currentStep === stepFromUrl) return;
    update({ currentStep: stepFromUrl });
  }, [stepFromUrl, app.currentStep, update]);

  // BF_CLIENT_STEP_PERSIST_v183 - the effect above keeps the step in the local
  // store only. Without this the server column stays at 1 forever, so an
  // application abandoned on arrival looks identical to one that reached step 5
  // and stalled. Fire-and-forget: a failed write must never block the wizard,
  // and the step is re-sent on the next transition anyway.
  useEffect(() => {
    if (stepFromUrl == null) return;
    const token = app.applicationToken
      ?? (OfflineStore.load() as { applicationToken?: string | null } | null)?.applicationToken;
    if (!token) return;
    if (lastPersistedStep.current === stepFromUrl) return;
    lastPersistedStep.current = stepFromUrl;
    void ClientAppAPI.update(token, { current_step: stepFromUrl }).catch((err) => {
      // The furthest step reached matters more than any single write, so a
      // failure here is logged and dropped rather than surfaced to the user.
      console.warn("[wizard] current_step persist failed", err);
      lastPersistedStep.current = null;
    });
  }, [stepFromUrl, app.applicationToken]);

  const cached = OfflineStore.load() as { applicationToken?: string | null } | null;
  const hasAppToken = Boolean(app.applicationToken) || Boolean(cached?.applicationToken);

  useEffect(() => {
    if (effectiveStep > 1 && !hasAppToken && location.pathname !== "/apply/step-1") {
      navigate("/apply/step-1", { replace: true });
    }
  }, [effectiveStep, hasAppToken, location.pathname, navigate]);

  let safeStep = effectiveStep;
  if (safeStep > 1 && !hasAppToken) safeStep = 1;

  // BF_CLIENT_GA4_STEP_TRACK_v1 — labeled funnel event per wizard step.
  useEffect(() => {
    const names = ["Financial Profile", "Product Category", "Business Details", "Applicant Information", "Documents", "Terms & Signature"];
    trackEvent("wizard_step", { step_number: safeStep, step_name: names[safeStep - 1] ?? `Step ${safeStep}` });
  }, [safeStep]);

  const StepComponent = STEP_COMPONENTS[safeStep - 1] ?? Step1;

  return (
    // BF_CLIENT_UI_CLUSTER_v1 — removed the redundant SlimHeader (mountain logo +
    // "Step X of 6"); StepHeader already provides branding, the step count, and the
    // progress stepper, so the two stacked bars were duplicates.
    <StepComponent />
  );
}
