import { Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { lazy, Suspense } from "react";
import { RequireOTP } from "@/auth/RequireOTP";
import { AppSpinner } from "@/components/ui/AppSpinner";

const LandingPage        = lazy(() => import("@/pages/LandingPage"));
const OtpPage            = lazy(() => import("@/pages/OtpPage"));
import Wizard from "@/wizard/Wizard";
const MiniPortalPage     = lazy(() => import("@/pages/MiniPortalPage"));
// BF_CLIENT_ACCOUNTANT_PORTAL_v1 - outside RequireOTP because that guard expects a client token.
const AccountantPage     = lazy(() => import("@/pages/AccountantPage"));
// BF_CLIENT_FLINKS_EMBED_DEMO_v1 - lender-facing sales asset. Public and
// noindex, outside RequireOTP, no API calls. Nothing links to it.
const FlinksDemoPage      = lazy(() => import("@/pages/FlinksDemoPage"));
const Stage2Page         = lazy(() => import("@/pages/mini-portal/forms/Stage2Page"));
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
        <Route path="/accountant" element={<AccountantPage />} />
        {/* BF_CLIENT_FLINKS_EMBED_DEMO_v1 */}
        <Route path="/flinks-demo" element={<FlinksDemoPage />} />
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
        {/* BF_CLIENT_BLOCK_TWO_STAGE_v1 */}
        <Route path="/mini-portal/forms/:applicationId" element={<RequireOTP><Stage2Page /></RequireOTP>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
