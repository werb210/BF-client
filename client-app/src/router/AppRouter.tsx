import { Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
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
      <ScrollToTop />
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
        {/* BF_ROUTER_EXPLICIT_STEPS_v41 — Block 41-B — React Router v7 does
            not match partial-segment dynamic params (`step-:stepNumber`),
            so the previous single route silently failed and the catch-all
            bounced users to /. Six explicit routes match exactly. */}
        <Route path="/apply/step-1" element={<RequireOTP><Wizard /></RequireOTP>} />
        <Route path="/apply/step-2" element={<RequireOTP><Wizard /></RequireOTP>} />
        <Route path="/apply/step-3" element={<RequireOTP><Wizard /></RequireOTP>} />
        <Route path="/apply/step-4" element={<RequireOTP><Wizard /></RequireOTP>} />
        <Route path="/apply/step-5" element={<RequireOTP><Wizard /></RequireOTP>} />
        <Route path="/apply/step-6" element={<RequireOTP><Wizard /></RequireOTP>} />
        <Route path="/portal" element={<RequireOTP><MiniPortalPage /></RequireOTP>} />
        <Route path="/application/:id" element={<RequireOTP><MiniPortalPage /></RequireOTP>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
