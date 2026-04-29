// BF_CLIENT_WIZARD_URL_SOT_v56 — URL is the single source of truth for
// the wizard step. Replaces v40/v55b's store-driven design where a
// store→URL useEffect could navigate the URL back to a stale value on
// the very first render of a freshly-mounted Wizard, leaving users
// stuck on Step 2 after clicking Continue (regression observed live in
// v55c with applicationToken=67b6bc97-...).
//
// Why the old code raced: AppRouter declares six per-step routes that
// each render <Wizard/>. React Router unmounts and remounts Wizard on
// every step transition. The new instance hydrates `app.currentStep`
// from localStorage on first render. Both URL→store and store→URL
// effects fire on first commit; if localStorage had a stale
// `currentStep`, store→URL would call navigate() back to that step
// before URL→store could update the store. The user's URL bar showed
// /apply/step-3 but the rendered component was still Step 2.
//
// New design:
//   - location.pathname /apply/step-N defines `effectiveStep`.
//   - `app.currentStep` is mirrored FROM the URL (one-way only), so
//     legacy code that reads it still works.
//   - Steps that want to advance call `navigate("/apply/step-N")`
//     directly.
//   - There is NO store→URL effect, so no race on mount.
//
// Pairs with the useApplicationStore.ts fix that purges the legacy
// `application_data` key on boot (it was shadowing fresh data).
import { useEffect, useMemo } from "react";
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

  // URL is the source of truth. Store currentStep is mirrored from URL.
  const effectiveStep = clampStep(stepFromUrl ?? app.currentStep ?? 1);

  // One-way mirror: URL → store. Keeps legacy code that reads
  // app.currentStep working.
  useEffect(() => {
    if (stepFromUrl == null) return;
    if (app.currentStep === stepFromUrl) return;
    update({ currentStep: stepFromUrl });
  }, [stepFromUrl, app.currentStep, update]);

  // Token guard: any step beyond 1 requires an application token. If we
  // don't have one, bounce to step 1.
  const cached = OfflineStore.load() as { applicationToken?: string | null } | null;
  const hasAppToken = Boolean(app.applicationToken) || Boolean(cached?.applicationToken);

  useEffect(() => {
    if (effectiveStep > 1 && !hasAppToken && location.pathname !== "/apply/step-1") {
      navigate("/apply/step-1", { replace: true });
    }
  }, [effectiveStep, hasAppToken, location.pathname, navigate]);

  let safeStep = effectiveStep;
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
      storeCurrentStep: app.currentStep,
    });
  }

  return <StepComponent />;
}

// BF_CLIENT_WIZARD_URL_SOT_v56_WIZARD_ANCHOR
