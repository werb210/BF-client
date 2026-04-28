import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { RequireOTP } from "@/auth/RequireOTP";
import { AppSpinner } from "@/components/ui/AppSpinner";

const LandingPage        = lazy(() => import("@/pages/LandingPage"));
const OtpPage            = lazy(() => import("@/pages/OtpPage"));
import Wizard from "@/wizard/Wizard";
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
        {/* BF_WIZARD_NUCLEAR_v40 — Block 40-A — single Wizard component renders the
            current step from store state. Same component instance for every step
            so React Router only swaps params, never elements — no route transition
            races, no chunk loading per step. */}
        <Route path="/apply" element={<RequireOTP><Wizard /></RequireOTP>} />
        <Route path="/apply/step-:stepNumber" element={<RequireOTP><Wizard /></RequireOTP>} />
        <Route path="/portal" element={<RequireOTP><MiniPortalPage /></RequireOTP>} />
        <Route path="/application/:id" element={<RequireOTP><MiniPortalPage /></RequireOTP>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
