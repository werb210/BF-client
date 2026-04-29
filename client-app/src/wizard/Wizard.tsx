// BF_WIZARD_NUCLEAR_v40 — Block 40-A — single-route, state-based wizard.
// Replaces six per-step routes (/apply/step-1 ... /apply/step-6) with one
// Wizard component that reads `app.currentStep` from the store and renders
// the right Step component. The URL is kept in sync (back-compat with old
// links and bookmarks), but the rendered component is determined by store
// state, not by Routes.
//
// Why this works: when Step 2 calls navigate("/apply/step-3"), React Router
// sees the SAME route (path="/apply/step-:stepNumber") with a different
// param. The Wizard instance stays mounted; only useEffect fires on the
// path change. We pull the new step number out, set currentStep, and React
// renders the new Step component. No route element swap → no transition
// stall, no chunk loading, no guard redirect.
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

const STEP_COMPONENTS = [Step1, Step2, Step3, Step4, Step5, Step6];
const STEP_PATTERN = /\/apply\/step-(\d+)\b/i;

function clampStep(n: number): number {
  if (!Number.isFinite(n)) return 1;
  if (n < 1) return 1;
  if (n > 6) return 6;
  return Math.floor(n);
}

export default function Wizard() {
  const { app, update } = useApplicationStore();
  const location = useLocation();
  const navigate = useNavigate();

  const stepFromUrl = useMemo<number | null>(() => {
    const m = location.pathname.match(STEP_PATTERN);
    if (!m) return null;
    const n = Number(m[1]);
    return n >= 1 && n <= 6 ? n : null;
  }, [location.pathname]);

  // BF_CLIENT_WIZARD_NAV_FIX_v55b — guard against URL/store ping-pong.
  const lastSyncedStep = useRef<number | null>(null);

  // URL → store. When URL is /apply/step-N, force currentStep=N.
  useEffect(() => {
    if (stepFromUrl == null) return;
    if (app.currentStep === stepFromUrl) return;
    if (lastSyncedStep.current === stepFromUrl) return;

    lastSyncedStep.current = stepFromUrl;
    update({ currentStep: stepFromUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepFromUrl]);

  // Store → URL. Keep URL synced for refresh/share/back-compat. `replace`
  // so we don't pollute history with every intra-wizard transition.
  useEffect(() => {
    const target = clampStep(app.currentStep || 1);
    const want = `/apply/step-${target}`;
    if (location.pathname === want) return;
    if (lastSyncedStep.current === target) return;

    lastSyncedStep.current = target;
    navigate(want, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.currentStep]);

  // Inline RequireApplicationToken: any step beyond 1 needs a token. If we
  // lost it, bounce back to Step 1. This replaces the per-route guard.
  const cached = OfflineStore.load() as { applicationToken?: string | null } | null;
  const hasAppToken = Boolean(app.applicationToken) || Boolean(cached?.applicationToken);

  let safeStep = clampStep(app.currentStep || 1);
  if (safeStep > 1 && !hasAppToken) {
    safeStep = 1;
  }

  const StepComponent = STEP_COMPONENTS[safeStep - 1] ?? Step1;

  if (typeof window !== "undefined") {
    console.log("[wizard] Wizard render", {
      currentStep: safeStep,
      pathname: location.pathname,
      stepFromUrl,
      hasAppToken,
    });
  }

  return <StepComponent />;
}
