import { Suspense, lazy, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { OfflineStore } from "../state/offline";
import { ClientProfileStore } from "../state/clientProfiles";
import { SessionGuard } from "../auth/sessionGuard";
import PortalRoutes from "../routes/PortalRoutes";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useClientSession } from "../hooks/useClientSession";
import { useApplicationStore } from "../state/useApplicationStore";
import { clearReadiness, setReadiness } from "../state/readinessStore";
import { fetchReadinessContext, getLeadIdFromSearch } from "../services/readiness";
import {
  fetchContinuation,
  fetchReadinessSession,
  getContinuationSession,
  mapContinuationToReadinessContext,
} from "../api/continuation";
import {
  clearStoredReadinessSession,
  resolveReadinessSessionId,
} from "@/api/website";
import { API_ENDPOINTS } from "@/api/endpoints";
import api from "../api/client";
import { clearToken, hasToken } from "@/lib/auth";

const StatusPage = lazy(() => import("../pages/StatusPage").then((module) => ({ default: module.StatusPage })));
const ApplicationPortalPage = lazy(() => import("../pages/ApplicationPortalPage").then((module) => ({ default: module.ApplicationPortalPage })));
const ApplicationOffersPage = lazy(() => import("../pages/ApplicationOffersPage").then((module) => ({ default: module.ApplicationOffersPage })));
const ResumePage = lazy(() => import("../pages/ResumePage").then((module) => ({ default: module.ResumePage })));
const OfflineFallback = lazy(() => import("../pages/OfflineFallback").then((module) => ({ default: module.OfflineFallback })));
const SessionExpiredPage = lazy(() => import("../pages/SessionExpiredPage").then((module) => ({ default: module.SessionExpiredPage })));
const SessionRevokedPage = lazy(() => import("../pages/SessionRevokedPage").then((module) => ({ default: module.SessionRevokedPage })));
const SystemStatus = lazy(() => import("../pages/SystemStatus"));
const PublicApplyPage = lazy(() => import("../pages/apply/PublicApplyPage"));
const PublicApplySuccessPage = lazy(() => import("../pages/apply/PublicApplySuccessPage"));
const ApplyPage = lazy(() => import("../pages/ApplyPage").then((module) => ({ default: module.ApplyPage })));
const PortalEntry = lazy(() => import("../pages/PortalEntry").then((module) => ({ default: module.PortalEntry })));
const ContinueApplication = lazy(() => import("../pages/ContinueApplication"));
const ProductDetail = lazy(() => import("../pages/ProductDetail"));
const ComingSoonPage = lazy(() => import("../pages/ComingSoon").then((module) => ({ default: module.ComingSoon })));
const FAQPage = lazy(() => import("../pages/FAQPage"));
const TroubleshootingPage = lazy(() => import("../pages/TroubleshootingPage"));
const ConfirmationPage = lazy(() => import("../pages/ConfirmationPage"));
const Step1 = lazy(() => import("../wizard/Step1_FinancialProfile"));
const Step2 = lazy(() => import("../wizard/Step2_ProductCategory"));
const Step3 = lazy(() => import("../wizard/Step3_BusinessDetails"));
const Step4 = lazy(() => import("../wizard/Step4_ApplicantInformation"));
const Step5 = lazy(() => import("../wizard/Step5_Documents"));
const Step6 = lazy(() => import("../wizard/Step6_TermsSignature"));
const ApplicationStep1 = lazy(() => import("../pages/application/ApplicationStep1"));
const ApplicationStep2 = lazy(() => import("../pages/application/ApplicationStep2"));

type GuardProps = {
  children: JSX.Element;
};

function RequireApplicationToken({ children }: GuardProps): JSX.Element {
  const { app } = useApplicationStore();
  const cached = OfflineStore.load();
  if (!app.applicationToken && !cached?.applicationToken) {
    return <Navigate to="/apply" replace />;
  }
  return children;
}

function RequirePortalSession({ children }: GuardProps): JSX.Element {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token") || "";
  const { state } = useClientSession(token);

  if (!token || state === "missing") {
    return <Navigate to="/portal" replace />;
  }

  if (state === "expired") {
    return <Navigate to="/expired" replace />;
  }

  if (state === "revoked") {
    return <Navigate to="/revoked" replace />;
  }

  if (!ClientProfileStore.hasPortalSession(token)) {
    return <Navigate to="/portal" replace />;
  }

  return children;
}

function RequireOTP({ children }: GuardProps): JSX.Element {
  const tokenPresent = typeof window !== "undefined" ? hasToken() : false;
  if (!tokenPresent) return <Navigate to="/otp" replace />;
  return children;
}

function ReadinessLoader(): null {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/otp" || location.pathname === "/portal") {
      return;
    }

    let active = true;

    const resolveLeadId = async (): Promise<string | null> => {
      const searchLeadId = getLeadIdFromSearch(location.search);
      if (searchLeadId) {
        return searchLeadId;
      }

      const storedLeadId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("leadId")
          : null;
      if (storedLeadId) {
        return storedLeadId;
      }

      try {
        const continuationSession = await getContinuationSession();
        const sessionLeadId =
          continuationSession?.leadId || continuationSession?.readinessLeadId;
        if (typeof sessionLeadId === "string" && sessionLeadId.trim()) {
          return sessionLeadId;
        }
      } catch {
        // no active continuation session
      }

      return null;
    };

    const loadReadiness = async (): Promise<void> => {
      try {
        const readinessSessionId = resolveReadinessSessionId(location.search);
        if (readinessSessionId) {
          const sessionPayload = await fetchReadinessSession(readinessSessionId);
          if (!active) return;
          if (sessionPayload) {
            setReadiness(mapContinuationToReadinessContext(sessionPayload, readinessSessionId));
            return;
          }

          const continuation = await fetchContinuation(readinessSessionId);
          if (!active) return;
          if (continuation) {
            setReadiness(mapContinuationToReadinessContext(continuation, readinessSessionId));
            return;
          }

          clearStoredReadinessSession();
        }

        const leadId = await resolveLeadId();
        if (!active) return;
        if (!leadId) {
          clearReadiness();
          return;
        }

        const readiness = await fetchReadinessContext(leadId);
        if (!active) return;
        if (!readiness) {
          clearReadiness();
          return;
        }
        setReadiness(readiness);
      } catch {
        if (active) {
          clearReadiness();
        }
      }
    };

    void loadReadiness();
    return () => {
      active = false;
    };
  }, [location.pathname, location.search]);

  return null;
}

export default function AppRouter(): JSX.Element {
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    if (typeof window === "undefined" || !hasToken()) {
      return;
    }

    api.get<{ ok?: boolean; data?: { user?: unknown } }>(API_ENDPOINTS.AUTH_ME)
      .then((res) => {
        if (!res?.data?.ok || !res?.data?.data) {
          clearToken();
          return;
        }
        const user = res.data.data.user;
        if (!user) {
          clearToken();
        }
      })
      .catch(() => {
        clearToken();
      });
  }, []);

  if (isOffline) {
    return (
      <Routes>
        <Route path="*" element={<OfflineFallback />} />
      </Routes>
    );
  }

  return (
    <>
      <SessionGuard />
      <ReadinessLoader />
      <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/apply" replace />} />
          <Route path="/portal" element={<PortalEntry />} />
          <Route path="/otp" element={<PortalEntry />} />
          <Route path="/expired" element={<SessionExpiredPage />} />
          <Route path="/revoked" element={<SessionRevokedPage />} />
          <Route path="/system-status" element={<SystemStatus />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/troubleshooting" element={<TroubleshootingPage />} />
          <Route element={<PortalRoutes />}>
            <Route
              path="/status"
              element={
                <RequirePortalSession>
                  <StatusPage />
                </RequirePortalSession>
              }
            />
            <Route path="/application/:id" element={<ApplicationPortalPage />} />
            <Route path="/application/:id/offers" element={<ApplicationOffersPage />} />
            <Route
              path="/application/:id/documents"
              element={<ApplicationPortalPage />}
            />
            <Route path="/resume" element={<ResumePage />} />
          </Route>
          <Route path="/continue/:token" element={<ContinueApplication />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/coming-soon" element={<ComingSoonPage />} />
          <Route path="/apply/success" element={<PublicApplySuccessPage />} />
          <Route path="/apply/confirmation" element={<ConfirmationPage />} />
          <Route path="/apply/start" element={<ApplicationStep1 />} />
          <Route path="/apply/start/step-2" element={<ApplicationStep2 />} />

          <Route
            path="/apply"
            element={
              <RequireOTP>
                <PublicApplyPage />
              </RequireOTP>
            }
          />
          <Route
            path="/apply/step-1"
            element={
              <RequireOTP>
                <Step1 />
              </RequireOTP>
            }
          />
          <Route
            path="/apply/step-2"
            element={
              <RequireOTP>
                <RequireApplicationToken>
                  <Step2 />
                </RequireApplicationToken>
              </RequireOTP>
            }
          />
          <Route
            path="/apply/step-3"
            element={
              <RequireOTP>
                <RequireApplicationToken>
                  <Step3 />
                </RequireApplicationToken>
              </RequireOTP>
            }
          />
          <Route
            path="/apply/step-4"
            element={
              <RequireOTP>
                <RequireApplicationToken>
                  <Step4 />
                </RequireApplicationToken>
              </RequireOTP>
            }
          />
          <Route
            path="/apply/step-5"
            element={
              <RequireOTP>
                <RequireApplicationToken>
                  <Step5 />
                </RequireApplicationToken>
              </RequireOTP>
            }
          />
          <Route
            path="/apply/step-6"
            element={
              <RequireOTP>
                <RequireApplicationToken>
                  <Step6 />
                </RequireApplicationToken>
              </RequireOTP>
            }
          />
          <Route
            path="/apply/:applicationId/*"
            element={
              <RequireOTP>
                <ApplyPage />
              </RequireOTP>
            }
          />

          <Route path="/application/step-:step" element={<Navigate to="/apply/step-1" />} />

          <Route
            path="*"
            element={
              <div className="text-center py-20">
                <h1 className="text-4xl font-semibold mb-4">Page Not Found</h1>
                <p className="text-white/60">The page does not exist.</p>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}
