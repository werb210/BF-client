// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { OfflineStore } from "./offline";
import { ApplicationData } from "../types/application";
import { clearDraft } from "../client/autosave";
import { clearSubmissionIdempotencyKey } from "../client/submissionIdempotency";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { getSessionId, trackEvent } from "../utils/analytics";
import { loadLocalBackup, useLocalBackup } from "../system/useLocalBackup";
import { apiRequest } from "@/api/client";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import { emptyApplicationDraft } from "../constants/applicationDraft";
import { hasToken } from "@/api/auth";

const emptyApp: ApplicationData = {
  applicationDraft: emptyApplicationDraft,
  kyc: {},
  productCategory: null,
  matchPercentages: {},
  eligibleProducts: [],
  eligibleCategories: [],
  eligibilityReasons: [],
  business: {},
  applicant: {},
  documents: {},
  productRequirements: {},
  termsAccepted: false,
  linkedApplicationTokens: [],
};

function hasActiveAuthSession() {
  return hasToken();
}

function buildApplicationDraft(source: ApplicationData) {
  const docs = Object.entries(source.documents || {}).map(([type, value]) => ({
    document_type: type,
    name: value?.name || type,
    status: value?.status || "missing",
    category: value?.category || type,
  }));

  return {
    borrower: {
      ...(source.kyc as Record<string, unknown> || {}),
      ...(source.applicant as Record<string, unknown> || {}),
    },
    company: {
      ...(source.business as Record<string, unknown> || {}),
    },
    financials: {
      fundingAmount: (source.kyc as Record<string, unknown>)?.fundingAmount,
      annualRevenue:
        (source.kyc as Record<string, unknown>)?.annualRevenue ||
        (source.kyc as Record<string, unknown>)?.revenueLast12Months,
      monthlyRevenue: (source.kyc as Record<string, unknown>)?.monthlyRevenue,
      accountsReceivable: (source.kyc as Record<string, unknown>)?.accountsReceivable,
    },
    application: {
      productCategory: source.productCategory,
      selectedProductId: source.selectedProductId,
      selectedProductType: source.selectedProductType,
      currentStep: source.currentStep,
      termsAccepted: source.termsAccepted,
      signatureDate: source.signatureDate,
    },
    documents: docs,
  };
}

const CLIENT_DRAFT_KEY = "boreal_client_draft";
const BOREAL_DRAFT_KEY = "boreal_draft";
const APPLICATION_STATE_KEY = "application_state";
const APPLICATION_DATA_KEY = "application_data";

function loadClientDraft(): ApplicationData | null {
  try {
    const raw = localStorage.getItem(CLIENT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ApplicationData;
  } catch {
    return null;
  }
}



function loadApplicationStateDraft(): ApplicationData | null {
  try {
    const raw = localStorage.getItem(APPLICATION_DATA_KEY) || localStorage.getItem(APPLICATION_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ApplicationData;
  } catch {
    return null;
  }
}

function loadBorealDraft(): ApplicationData | null {
  try {
    const raw = localStorage.getItem(BOREAL_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ApplicationData;
  } catch {
    return null;
  }
}

function hydrateApplication(saved: ApplicationData | null): ApplicationData {
  if (!saved) return emptyApp;

  const savedKyc = saved.kyc || {};
  const savedMatchPercentages = saved.matchPercentages || {};
  const savedEligibleProducts = saved.eligibleProducts || [];
  const savedEligibleCategories = saved.eligibleCategories || [];
  const savedEligibilityReasons = saved.eligibilityReasons || [];
  const savedBusiness = saved.business || {};
  const savedApplicant = saved.applicant || {};
  const savedDocuments = saved.documents || {};
  const savedProductRequirements = saved.productRequirements || {};
  const normalizedDocuments = Object.fromEntries(
    Object.entries(savedDocuments).map(([key, value]) => {
      const entry = value as {
        name?: string;
        base64?: string;
        category?: string;
        productId?: string;
        status?: "uploaded" | "accepted" | "rejected";
      };
      return [
        key,
        {
          name: entry.name || key,
          base64: entry.base64 || "",
          category: entry.category || key,
          productId: entry.productId,
          status: entry.status,
        },
      ];
    })
  );
  const savedClosingCostFunding =
    typeof saved.requires_closing_cost_funding === "boolean"
      ? saved.requires_closing_cost_funding
      : undefined;

  const hydrated = {
    ...emptyApp,
    ...saved,
    requires_closing_cost_funding: savedClosingCostFunding,
    kyc: { ...emptyApp.kyc, ...savedKyc },
    matchPercentages: {
      ...emptyApp.matchPercentages,
      ...savedMatchPercentages,
    },
    eligibleProducts: savedEligibleProducts,
    eligibleCategories: savedEligibleCategories,
    eligibilityReasons: savedEligibilityReasons,
    business: { ...emptyApp.business, ...savedBusiness },
    applicant: { ...emptyApp.applicant, ...savedApplicant },
    documents: { ...emptyApp.documents, ...normalizedDocuments },
    productRequirements: {
      ...emptyApp.productRequirements,
      ...savedProductRequirements,
    },
    linkedApplicationTokens:
      saved.linkedApplicationTokens || emptyApp.linkedApplicationTokens,
    documentReviewComplete: saved.documentReviewComplete,
    financialReviewComplete: saved.financialReviewComplete,
    readinessScore:
      typeof saved.readinessScore === "number" ? saved.readinessScore : undefined,
    readinessLeadId:
      typeof saved.readinessLeadId === "string" ? saved.readinessLeadId : undefined,
    ocrComplete: typeof saved.ocrComplete === "boolean" ? saved.ocrComplete : undefined,
    creditSummaryComplete:
      typeof saved.creditSummaryComplete === "boolean"
        ? saved.creditSummaryComplete
        : undefined,
  };

  return {
    ...hydrated,
    applicationDraft: saved.applicationDraft || buildApplicationDraft(hydrated),
  };
}

export function useApplicationStore() {
  const [app, setApp] = useState<ApplicationData>(() =>
    hydrateApplication(loadApplicationStateDraft() || loadBorealDraft() || loadClientDraft() || OfflineStore.load())
  );
  const [initialized, setInitialized] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const { isOffline } = useNetworkStatus();
  const trackedStep = useRef<number | undefined>(undefined);
  const stepStartTime = useRef<number>(Date.now());

  const canAutosave = (app.currentStep ?? 0) >= 1;

  useLocalBackup(app);

  useEffect(() => {
    const serialized = JSON.stringify(app);
    localStorage.setItem(BOREAL_DRAFT_KEY, serialized);
    localStorage.setItem(APPLICATION_STATE_KEY, serialized);
    localStorage.setItem(APPLICATION_DATA_KEY, serialized);
  }, [app]);

  const saveToServer = useMemo(
    () =>
      debounce(async (state: ApplicationData) => {
        if (!state.applicationToken || !hasActiveAuthSession()) return;

        await apiRequest(API_ENDPOINTS_CONTRACT.APPLICATION.UPDATE, {
          method: "POST",
          body: JSON.stringify(state),
        });
      }, 1500),
    []
  );

  function init() {
    if (initialized) return;

    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const isOtpScreen = pathname === "/otp" || pathname === "/portal";

    if (!isOtpScreen && hasActiveAuthSession()) {
      void import("../lender/productSync").then(({ ProductSync }) => {
        ProductSync.invalidateCache();
        void ProductSync.sync().catch(() => {
        });
      });
    }

    setInitialized(true);
  }

  function update(part: Partial<ApplicationData>) {
    setApp((state) => {
      const nextState = { ...state, ...part } as ApplicationData;
      const updated = {
        ...nextState,
        applicationDraft: buildApplicationDraft(nextState),
      };
      OfflineStore.save(updated);

      if (!canAutosave) {
        return updated;
      }

      if (isOffline) {
        setAutosaveError("You're offline. Changes will sync when you reconnect.");
        return updated;
      }

      if (updated) {
        if (typeof saveToServer === "function") {
          void saveToServer(updated);
        }
      }

      return updated;
    });
  }


  function loadFromServer(state: Partial<ApplicationData>) {
    setApp((prev) => {
      const next = hydrateApplication({ ...prev, ...state } as ApplicationData);
      OfflineStore.save(next);
      return next;
    });
  }

  function reset() {
    setApp(emptyApp);
    OfflineStore.clear();
    localStorage.removeItem(CLIENT_DRAFT_KEY);
    localStorage.removeItem(BOREAL_DRAFT_KEY);
    localStorage.removeItem(APPLICATION_STATE_KEY);
    localStorage.removeItem(APPLICATION_DATA_KEY);
    clearDraft();
    clearSubmissionIdempotencyKey();
  }

  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [initialized]);

  useEffect(() => {
    if (app.applicationToken) return;
    const backup = loadLocalBackup<ApplicationData>();
    if (!backup) return;
    setApp((prev) => ({ ...prev, ...backup }));
  }, [app.applicationToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(CLIENT_DRAFT_KEY, JSON.stringify(app));
    }, 300);

    return () => clearTimeout(timer);
  }, [app]);

  useEffect(() => {
    if (!app.currentStep || trackedStep.current === app.currentStep) return;

    if (trackedStep.current !== undefined) {
      const duration = Date.now() - stepStartTime.current;
      trackEvent("application_step_completed", {
        step: trackedStep.current,
        time_spent_ms: duration,
        session_id: getSessionId(),
      });
      trackEvent("step_completed", {
        step: trackedStep.current,
        time_spent_ms: duration,
        session_id: getSessionId(),
      });
    }

    trackedStep.current = app.currentStep;
    stepStartTime.current = Date.now();
    trackEvent("application_step_view", { step: app.currentStep });
    trackEvent("client_step_progressed", { step: app.currentStep });
  }, [app.currentStep]);

  useEffect(() => {
    if (!isOffline) {
      setAutosaveError(null);
    }
  }, [isOffline]);

  useEffect(() => {
    if (isOffline || !app.applicationToken || !canAutosave || !hasActiveAuthSession()) return;
    if (!app) return;

    if (app) {
      if (typeof saveToServer === "function") {
        void saveToServer(app);
      }
    }
  }, [app, canAutosave, isOffline, saveToServer]);

  useEffect(() => {
    const persist = () => {
      localStorage.setItem(APPLICATION_STATE_KEY, JSON.stringify(app));
      localStorage.setItem(APPLICATION_DATA_KEY, JSON.stringify(app));
    };

    window.addEventListener("blur", persist);
    window.addEventListener("beforeunload", persist);

    return () => {
      window.removeEventListener("blur", persist);
      window.removeEventListener("beforeunload", persist);
    };
  }, [app]);

  useEffect(() => {
    return () => {
      saveToServer.cancel();
    };
  }, [saveToServer]);

  return {
    app,
    initialized,
    init,
    update,
    reset,
    loadFromServer,
    autosaveError,
    applicationToken: app.applicationToken,
    setToken(token: string) {
      const next = { ...app, applicationToken: token };
      update(next);
    },
  };
}
