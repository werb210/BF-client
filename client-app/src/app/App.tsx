import { useCallback, useEffect, useRef, useState } from "react";
import AppRoutes from "./AppRoutes";
import { Header } from "../components/Header";
import { OfflineBanner } from "../components/OfflineBanner";
import { InstallPromptBanner } from "../components/InstallPromptBanner";
import { UpdateAvailableBanner } from "../components/UpdateAvailableBanner";
import { SessionRefreshOverlay } from "../components/SessionRefreshOverlay";
import CapitalReadinessPopup from "../components/CapitalReadinessPopup";
import CapitalScorePreview from "../components/CapitalScorePreview";
import ProductComparisonPopup from "../components/ProductComparisonPopup";
import QuickContact from "../components/QuickContact";
import { useSessionRefreshing } from "../hooks/useSessionRefreshing";
import { useServiceWorkerUpdate } from "../hooks/useServiceWorkerUpdate";
import { applyServiceWorkerUpdate } from "../pwa/serviceWorker";
import type { InitialSession } from "./bootstrap";
import { hydratePortalSessionsFromIndexedDb } from "../state/portalSessions";
import { useExitIntent } from "../hooks/useExitIntent";
import {
  classifyReadiness,
  estimateClientCommission,
  getSessionId,
  trackEvent,
} from "../utils/analytics";
import { persistAttributionFromUrl } from "../utils/attribution";
import ChatSupportWidget from "@/components/ChatSupportWidget";
import { useApplicationStore } from "../state/useApplicationStore";
import { useReadinessBridge } from "@/hooks/useReadinessBridge";
import { buildApiUrl } from "@/api/client";
import { initializeVoice } from "@/telephony/voiceClient";
import CallUsButton from "@/telephony/components/CallUsButton";
import { getCallStatus } from "@/services/telephonyService";
import { safeFetch } from "@/utils/safeFetch";
import { hasToken, setToken } from "@/api/auth";
import { useAuth } from "@/auth/useAuth";
import ErrorBoundary from "../components/ErrorBoundary";
import FatalErrorScreen from "./FatalErrorScreen";

type AppProps = {
  initialSession?: InitialSession | null;
};

export default function App({ initialSession = null }: AppProps) {
  const { app, loadFromServer, update } = useApplicationStore();
  const appRef = useRef(app);
  const refreshing = useSessionRefreshing();
  const updateAvailable = useServiceWorkerUpdate();
  const [session] = useState<InitialSession | null>(initialSession);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const [continuationError, setContinuationError] = useState<string | null>(null);
  const [isBackendDegraded, setIsBackendDegraded] = useState(false);
  const hasInitializedClientVoice = useRef(false);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const isOtpScreen = pathname === "/otp" || pathname === "/portal";

  useEffect(() => {
    appRef.current = app;
  }, [app]);

  useExitIntent(() => {
    trackEvent("client_exit_intent_detected");
  });

  const setStep1Data = useCallback((step1Data: Record<string, any>) => {
    update({
      readinessSessionToken: localStorage.getItem("creditSessionToken") || appRef.current.readinessSessionToken,
      kyc: {
        ...(appRef.current.kyc as Record<string, any>),
        ...step1Data,
      },
    });
  }, [update]);

  const setStep3Data = useCallback((step3Data: Record<string, any>) => {
    update({
      business: {
        ...(appRef.current.business as Record<string, any>),
        ...step3Data,
      },
    });
  }, [update]);

  const setStep4Data = useCallback((step4Data: Record<string, any>) => {
    update({
      applicant: {
        ...(appRef.current.applicant as Record<string, any>),
        ...step4Data,
      },
    });
  }, [update]);

  useReadinessBridge(setStep1Data, setStep3Data, setStep4Data, !isOtpScreen);

  useEffect(() => {
    if (session?.token && !hasToken()) {
      setToken(session.token);
    }

    setLoading(false);
  }, [session]);

  const debugUpdateAvailable =
    typeof window !== "undefined" &&
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("debugUpdateBanner");

  useEffect(() => {
    void hydratePortalSessionsFromIndexedDb();
  }, []);

  useEffect(() => {
    persistAttributionFromUrl();
  }, []);

  useEffect(() => {
    const sessionId = getSessionId();

    trackEvent("client_session_started", {
      session_id: sessionId,
    });
  }, []);

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "page_view",
      page_path: window.location.pathname,
    });
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const estimatedValue = estimateClientCommission(
        Number((app.kyc as Record<string, any>)?.fundingAmount || 0)
      );

      trackEvent("application_abandoned", {
        current_step: app.currentStep,
        estimated_commission_value: estimatedValue,
        underwriting_readiness: classifyReadiness(),
        risk_level:
          (app.currentStep || 0) <= 2
            ? "low_intent"
            : (app.currentStep || 0) <= 4
              ? "medium_intent"
              : "high_intent",
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [app.currentStep]);

  useEffect(() => {
    if (isOtpScreen) return;

    const continuation = window.__APP_CONTINUATION__;
    if (!continuation?.applicationId) return;

    loadFromServer({
      applicationId: continuation.applicationId,
      applicationToken: continuation.applicationId,
      currentStep: continuation.step,
      ...(continuation.data || {}),
    });
    update({
      applicationId: continuation.applicationId,
      applicationToken: continuation.applicationId,
      currentStep: continuation.step,
    });
  }, [isOtpScreen, loadFromServer, update]);

  useEffect(() => {
    if (window.__APP_CONTINUATION_ERROR__) {
      setContinuationError(window.__APP_CONTINUATION_ERROR__);
    }
  }, []);

  useEffect(() => {
    if (isOtpScreen) {
      return;
    }

    if (hasInitializedClientVoice.current) {
      return;
    }

    hasInitializedClientVoice.current = true;

    void (async () => {
      try {
        await getCallStatus();
        await initializeVoice("client_user");
      } catch {
        // ignore voice initialization failures
      }
    })();
  }, [isOtpScreen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session");

    if (!session) return;

    void safeFetch(buildApiUrl(`/credit-readiness/session/${session}`))
      .then((data) => {
        if (data && typeof data === "object" && "degraded" in data && data.degraded === true) {
          setIsBackendDegraded(true);
          return;
        }

        localStorage.setItem("creditPrefill", JSON.stringify(data));
      })
      .catch(() => {
        // ignore prefill fetch failures
      });
  }, []);

  if (loading || authLoading) {
    return null;
  }

  void user;

  if (refreshing) {
    return <SessionRefreshOverlay />;
  }

  const appContent = (
    <div className="min-h-screen bg-brand-bg text-white flex flex-col">
      <Header />
      <OfflineBanner />
      {isBackendDegraded && (
        <div className="mx-auto mt-4 w-full max-w-[var(--portal-max-width)] rounded border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          System temporarily unavailable
        </div>
      )}
      {continuationError && (
        <div className="mx-auto mt-4 w-full max-w-[var(--portal-max-width)] rounded border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {continuationError}
        </div>
      )}
      <InstallPromptBanner />
      <UpdateAvailableBanner
        updateAvailable={updateAvailable || debugUpdateAvailable}
        onApplyUpdate={() => void applyServiceWorkerUpdate()}
      />
      {!isOtpScreen && (
        <div className="mx-auto mt-4 w-full max-w-7xl px-6 flex justify-end">
          <CallUsButton />
        </div>
      )}
      <main className="max-w-7xl mx-auto px-6 py-14 md:py-20 w-full flex-1">
        <ErrorBoundary fallback={<FatalErrorScreen />}><AppRoutes /></ErrorBoundary>
      </main>
      <footer className="bg-brand-bgAlt border-t border-subtle py-8 text-center text-sm text-gray-300">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row gap-4 justify-center">
          <CapitalReadinessPopup />
          <ProductComparisonPopup />
          <CapitalScorePreview />
        </div>
      </footer>
      <QuickContact />
      <ChatSupportWidget />
    </div>
  );

  return appContent;
}
