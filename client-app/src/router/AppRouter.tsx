import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { RequireOTP } from "@/auth/RequireOTP";
import { RequireApplicationToken } from "@/auth/RequireApplicationToken";
import { AppSpinner } from "@/components/ui/AppSpinner";

const OtpPage = lazy(() => import("@/pages/OtpPage"));
const Step1 = lazy(() => import("@/wizard/Step1_FinancialProfile"));
const Step2 = lazy(() => import("@/wizard/Step2_ProductCategory"));
const Step3 = lazy(() => import("@/wizard/Step3_BusinessDetails"));
const Step4 = lazy(() => import("@/wizard/Step4_ApplicantInformation"));
const Step5 = lazy(() => import("@/wizard/Step5_Documents"));
const Step6 = lazy(() => import("@/wizard/Step6_TermsSignature"));
const MiniPortalPage = lazy(() => import("@/pages/MiniPortalPage"));
const SessionExpiredPage = lazy(() => import("@/pages/SessionExpiredPage").then((m) => ({ default: m.SessionExpiredPage })));
const SessionRevokedPage = lazy(() => import("@/pages/SessionRevokedPage").then((m) => ({ default: m.SessionRevokedPage })));
const OfflineFallback = lazy(() => import("@/pages/OfflineFallback").then((m) => ({ default: m.OfflineFallback })));

export default function AppRouter() {
  return (
    <Suspense fallback={<AppSpinner />}>
      <Routes>
        <Route path="/" element={<Navigate to="/otp" replace />} />
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
        <Route path="/apply/step-:n" element={<Navigate to="/otp" replace />} />

        <Route path="*" element={<Navigate to="/otp" replace />} />
      </Routes>
    </Suspense>
  );
}
