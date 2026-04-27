import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { RequireOTP } from "@/auth/RequireOTP";
import { RequireApplicationToken } from "@/auth/RequireApplicationToken";
import { AppSpinner } from "@/components/ui/AppSpinner";

const LandingPage        = lazy(() => import("@/pages/LandingPage"));
const OtpPage            = lazy(() => import("@/pages/OtpPage"));
// BF_EAGER_WIZARD_v39 — Block 39-B — wizard steps are now eager imports.
// Lazy chunks were causing React 18 transition stalls when the Service
// Worker returned stale chunk-hash 404s (e.g., after a fresh deploy).
// Bundling all six steps in the main JS adds ~30KB but eliminates the
// "click Continue but nothing happens" failure mode entirely.
import Step1 from "@/wizard/Step1_FinancialProfile";
import Step2 from "@/wizard/Step2_ProductCategory";
import Step3 from "@/wizard/Step3_BusinessDetails";
import Step4 from "@/wizard/Step4_ApplicantInformation";
import Step5 from "@/wizard/Step5_Documents";
import Step6 from "@/wizard/Step6_TermsSignature";
const MiniPortalPage     = lazy(() => import("@/pages/MiniPortalPage"));
const SessionExpiredPage = lazy(() => import("@/pages/SessionExpiredPage").then((m) => ({ default: m.SessionExpiredPage })));
const SessionRevokedPage = lazy(() => import("@/pages/SessionRevokedPage").then((m) => ({ default: m.SessionRevokedPage })));
const OfflineFallback    = lazy(() => import("@/pages/OfflineFallback").then((m) => ({ default: m.OfflineFallback })));

export default function AppRouter() {
  return (
    <Suspense fallback={<AppSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/otp" element={<OtpPage />} />
        <Route path="/expired" element={<SessionExpiredPage />} />
        <Route path="/revoked" element={<SessionRevokedPage />} />
        <Route path="/offline" element={<OfflineFallback />} />
        <Route path="/apply/step-1" element={<RequireOTP><Step1 /></RequireOTP>} />
        <Route path="/apply/step-2" element={<RequireOTP><RequireApplicationToken><Step2 /></RequireApplicationToken></RequireOTP>} />
        <Route path="/apply/step-3" element={<RequireOTP><RequireApplicationToken><Step3 /></RequireApplicationToken></RequireOTP>} />
        <Route path="/apply/step-4" element={<RequireOTP><RequireApplicationToken><Step4 /></RequireApplicationToken></RequireOTP>} />
        <Route path="/apply/step-5" element={<RequireOTP><RequireApplicationToken><Step5 /></RequireApplicationToken></RequireOTP>} />
        <Route path="/apply/step-6" element={<RequireOTP><RequireApplicationToken><Step6 /></RequireApplicationToken></RequireOTP>} />
        <Route path="/portal" element={<RequireOTP><MiniPortalPage /></RequireOTP>} />
        <Route path="/application/:id" element={<RequireOTP><MiniPortalPage /></RequireOTP>} />
        <Route path="/apply" element={<Navigate to="/otp" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
