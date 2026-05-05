// @ts-nocheck
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApplicationStore } from "../state/useApplicationStore";
import { StepHeader } from "../components/StepHeader";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Validate } from "../utils/validate";
import { WizardLayout } from "../components/WizardLayout";
import {
  formatCurrencyValue,
  getCountryCode,
  sanitizeCurrencyInput,
} from "../utils/location";
import {
  FUNDING_INTENT_OPTIONS,
  normalizeFundingIntent,
} from "../constants/wizard";
import { components, layout, scrollToFirstError, tokens } from "@/styles";
import { loadStepData, mergeDraft, saveStepData } from "../client/autosave";
import {
  getNextFieldKey,
  getWizardFieldId,
} from "./wizardSchema";
import { enforceV1StepSchema } from "../schemas/v1WizardSchema";
import { track } from "../utils/track";
import { trackEvent } from "../utils/analytics";
import { setReadiness, useReadiness } from "../state/readinessStore";
import { persistApplicationStep } from "./saveStepProgress";
import { fetchCreditPrefill } from "../services/creditPrefill";
import { fetchReadinessPrefill } from "@/api/readiness";

const MatchCategories = [
  "Line of Credit",
  "Factoring",
  "Purchase Order Financing",
  "Term Loan",
  "Equipment Financing",
];

const MatchBaselines: Record<string, number> = {
  "Line of Credit": 68,
  Factoring: 74,
  "Purchase Order Financing": 62,
  "Term Loan": 65,
  "Equipment Financing": 70,
};

const BusinessLocationOptions = ["Canada", "United States", "Other"];


// BF_CLIENT_BLOCK_v89_ELIGIBILITY_RULES_AND_MULTI_LEG_v1
// PurposeOptions is now built dynamically in the component — see
// `visiblePurposeOptions` — so "Start up Funding" and "Media Financing"
// can be conditionally hidden when no matching product exists. The
// canonical static list lives here for reference; consumers should
// use `visiblePurposeOptions` instead.
const PurposeOptions = [
  "Start up Funding",
  "Media Financing",
  "Working Capital",
  "Funds to cover A/R",
  "Buy Inventory",
  "Expansion",
];

const SalesHistoryOptions = [
  "Zero",
  "Under 1 Year",
  "1 to 3 Years",
  "Over 3 Years",
];

const RevenueOptions = [
  "Zero to $150,000",
  "$150,001 to $500,000",
  "$500,001 to $1,000,000",
  "$1,000,001 to $3,000,000",
  "Over $3,000,000",
];

// BF_CLIENT_BLOCK_v91_ELIGIBILITY_RULES_AND_STEP1_HARDSTOPS_v1
const MonthlyRevenueOptions = [
  "Under $10,000",
  "$10,000 to $25,000",
  "$25,000 to $50,000",
  "$50,000 to $100,000",
  "$100,000 to $250,000",
  "Over $250,000",
];

const AccountsReceivableOptions = [
  "No Account Receivables",
  "Zero to $100,000",
  "$100,000 to $250,000",
  "$250,000 to $500,000",
  "$500,000 to $1,000,000",
  "$1,000,000 to $3,000,000",
  "Over $3,000,000",
];


type Step1KycData = Partial<{
  industry: string;
  yearsInBusiness: string;
  annualRevenue: string;
  monthlyRevenue: string;
  arBalance: string;
  availableCollateral: string;
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
}>;

const FixedAssetsOptions = [
  "None", "$1 to $50,000", "$50,001 to $100,000",
  "$100,001 to $250,000", "$250,001 to $500,000", "Over $500,000",
];

// BF_CLIENT_BLOCK_v110_PARSECURRENCY_GUARD_v1 — for Equipment-only flow
// payload.fundingAmount is undefined. Without this guard, value.replace()
// throws and startApplication shows "Something went wrong. Please try again."
// banner, blocking the user from advancing past Step 1.
function parseCurrency(value: string | undefined | null): number {
  if (value === undefined || value === null) return Number.NaN;
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  return Number.parseFloat(cleaned);
}

function mapYearsInBusiness(years?: number): string | undefined {
  if (typeof years !== "number") return undefined;
  if (years <= 0) return "Zero";
  if (years < 1) return "Under 1 Year";
  if (years <= 3) return "1 to 3 Years";
  return "Over 3 Years";
}

function mapAnnualRevenue(amount?: number): string | undefined {
  if (typeof amount !== "number") return undefined;
  if (amount <= 150000) return "Zero to $150,000";
  if (amount <= 500000) return "$150,001 to $500,000";
  if (amount <= 1000000) return "$500,001 to $1,000,000";
  if (amount <= 3000000) return "$1,000,001 to $3,000,000";
  return "Over $3,000,000";
}

function mapMonthlyRevenue(amount?: number): string | undefined {
  if (typeof amount !== "number") return undefined;
  if (amount <= 10000) return "Under $10,000";
  if (amount <= 30000) return "$10,001 to $30,000";
  if (amount <= 100000) return "$30,001 to $100,000";
  return "Over $100,000";
}

function mapArOutstanding(amount?: number): string | undefined {
  if (typeof amount !== "number") return undefined;
  if (amount <= 0) return "No Account Receivables";
  if (amount < 100000) return "Zero to $100,000";
  if (amount < 250000) return "$100,000 to $250,000";
  if (amount < 500000) return "$250,000 to $500,000";
  if (amount < 1000000) return "$500,000 to $1,000,000";
  if (amount < 3000000) return "$1,000,000 to $3,000,000";
  return "Over $3,000,000";
}

function buildMatchPercentages(amount: number): Record<string, number> {
  const amountBoost =
    amount >= 500000 ? 10 : amount >= 250000 ? 7 : amount >= 100000 ? 4 : 0;
  return MatchCategories.reduce((acc, category) => {
    const base = MatchBaselines[category] ?? 60;
    const clamped = Math.max(0, Math.min(100, base + amountBoost));
    acc[category] = clamped;
    return acc;
  }, {} as Record<string, number>);
}

export function Step1_KYC(): JSX.Element {
  const { app, update, autosaveError } = useApplicationStore();
  const readiness = useReadiness();
  // BF_CLIENT_BLOCK_v89_ELIGIBILITY_RULES_AND_MULTI_LEG_v1
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMinRevenueModal, setShowMinRevenueModal] = useState(false);
  const [lenderProducts, setLenderProducts] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ProductSync = (await import("./productSelection"))?.ProductSync;
        const list = ProductSync ? ProductSync.load() : [];
        if (!cancelled) setLenderProducts(list);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const countryCode = useMemo(
    () => getCountryCode(app.kyc.businessLocation),
    [app.kyc.businessLocation]
  );

  const startupAvailable = useMemo(() => {
    const country = app.kyc.businessLocation === "Canada" ? "CA"
      : app.kyc.businessLocation === "United States" ? "US" : null;
    if (!country) return false;
    return lenderProducts.some((p) => {
      const cat = String((p as any).category ?? "").toUpperCase();
      if (cat !== "STARTUP" && cat !== "STARTUP_CAPITAL") return false;
      const c = String((p as any).country ?? "").toUpperCase();
      if (c !== country && c !== "BOTH" && c !== "") return false;
      return ((p as any).active ?? true) === true;
    });
  }, [lenderProducts, app.kyc.businessLocation]);
  const visiblePurposeOptions = useMemo(() => {
    return PurposeOptions.filter((opt) => opt !== "Start up Funding" || startupAvailable);
  }, [startupAvailable]);
  const visibleSalesHistoryOptions = useMemo(() => {
    return SalesHistoryOptions.filter((opt) => opt !== "Zero" || startupAvailable);
  }, [startupAvailable]);

  const sessionExpired = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("reason") === "session_expired";
  }, []);
  // BF_STEP1_CLEANUP_v25 — clear Block 23 residue on mount
  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("bf_application_pending_submit");
    }
  }, []);

  useEffect(() => {
    if (app.currentStep !== 1) {
      update({ currentStep: 1 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- BF_STEP_RESET_NORACE_v37 (Block 37) — running on every currentStep change caused unmounting step to reset back, fighting next step’s mount effect

  useEffect(() => {
    if (!readiness) return;

    const nextKyc = {
      ...app.kyc,
      companyName: readiness.companyName ?? app.kyc.companyName,
      industry: readiness.industry ?? app.kyc.industry,
      salesHistory:
        mapYearsInBusiness(readiness.yearsInBusiness) ?? app.kyc.salesHistory,
      monthlyRevenue:
        mapMonthlyRevenue(readiness.monthlyRevenue) ?? app.kyc.monthlyRevenue,
      revenueLast12Months:
        mapAnnualRevenue(readiness.annualRevenue) ?? app.kyc.revenueLast12Months,
      accountsReceivable:
        mapArOutstanding(readiness.arOutstanding) ?? app.kyc.accountsReceivable,
fixedAssets:
        readiness.collateralAvailable ?? app.kyc.fixedAssets,
    };

    const unchanged =
      app.readinessLeadId === readiness.leadId &&
      nextKyc.companyName === app.kyc.companyName &&
      nextKyc.industry === app.kyc.industry &&
      nextKyc.salesHistory === app.kyc.salesHistory &&
      nextKyc.monthlyRevenue === app.kyc.monthlyRevenue &&
      nextKyc.revenueLast12Months === app.kyc.revenueLast12Months &&
      nextKyc.accountsReceivable === app.kyc.accountsReceivable &&
      nextKyc.fixedAssets === app.kyc.fixedAssets;

    if (unchanged) return;

    update({
      readinessLeadId: readiness.leadId,
      // BF_CLIENT_BLOCK_v91_ELIGIBILITY_RULES_AND_STEP1_HARDSTOPS_v1
                    kyc: {
                      ...nextKyc,
                      fundingAmount: nextIntent === "EQUIPMENT" ? "" : nextKyc.fundingAmount,
                      equipmentAmount: nextIntent === "WORKING_CAPITAL" ? "" : (nextKyc as any).equipmentAmount,
                    },
    });
  }, [
    app.kyc,
    app.readinessLeadId,
    readiness,
    update,
  ]);

  useEffect(() => {
    trackEvent("application_started", { step: 1 });
    trackEvent("client_step_viewed", { step: 1 });
  }, []);

  useEffect(() => {
    // BF_CLIENT_BLOCK_v102_URL_PREFILL_v1
    // BF-Website hands off the readiness session via URL search params
    // because sessionStorage is per-origin and can't survive the redirect
    // from boreal.financial -> client.boreal.financial. Accept any of:
    //   ?continue=         (BF-Server submitCreditReadiness redirect)
    //   ?sessionId=        (BF-Website utils/session.ts)
    //   ?readinessSession= (BF-Website utils/session.ts duplicate key)
    // Falls back to sessionStorage for any in-app navigation that already
    // primed it (legacy callers).
    let token: string | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      token =
        params.get("continue") ||
        params.get("sessionId") ||
        params.get("readinessSession") ||
        null;
    } catch {
      token = null;
    }
    if (!token) {
      token = sessionStorage.getItem("readiness_token");
    }
    if (!token) return;

    void fetchReadinessPrefill(token, "token")
      .then((prefill) => {
        if (prefill?.found && prefill.prefill) {
          setReadiness(prefill.prefill as any);
        }
      })
      .catch(() => {
        // best-effort prefill only
      })
      .finally(() => {
        sessionStorage.removeItem("readiness_token");
      });
  }, []);

  // BF_CLIENT_v?_BLOCK_1_15_PHONE_BASED_READINESS_PREFILL — phone-based
  // hydration. Runs once on Step 1 mount when the user just OTP'd in with a
  // phone the website already knows about.
  useEffect(() => {
    const phone = sessionStorage.getItem("verified_phone");
    if (!phone) return;

    void fetchReadinessPrefill(phone, "phone")
      .then((response) => {
        if (!response?.found || !response.prefill) return;
        const p = response.prefill as Record<string, unknown>;

        // Promote into the readiness store (legacy consumers).
        setReadiness(p as any);

        // Hydrate the wizard's KYC slice with the V1 14-field response.
        const fullName = String(p.fullName ?? "").trim();
        const [firstName = "", ...lastParts] = fullName.split(/\s+/);
        const lastName = lastParts.join(" ");

        update({
          kyc: {
            ...app.kyc,
            // identity
            companyName: (p.companyName as string) ?? app.kyc.companyName ?? "",
            fullName: fullName || app.kyc.fullName || "",
            email: (p.email as string) ?? app.kyc.email ?? "",
            phone: (p.phone as string) ?? app.kyc.phone ?? phone,
            // business profile
            industry: (p.industry as string) ?? app.kyc.industry ?? "",
            businessLocation:
              (p.businessLocation as string) ?? app.kyc.businessLocation ?? "",
            // funding profile
            fundingType: (p.fundingType as string) ?? app.kyc.fundingType ?? "",
            requestedAmount:
              p.requestedAmount != null && p.requestedAmount !== ""
                ? String(p.requestedAmount)
                : app.kyc.requestedAmount ?? "",
            purposeOfFunds:
              (p.purposeOfFunds as string) ?? app.kyc.purposeOfFunds ?? "",
            // financial profile (V1 bucket strings — these are exact matches
            // to the Step 1 select options, no remapping needed)
            yearsInBusiness:
              (p.salesHistoryYears as string) ??
              (p.yearsInBusiness as string) ??
              app.kyc.yearsInBusiness ??
              "",
            annualRevenue:
              (p.annualRevenueRange as string) ??
              (p.annualRevenue as string) ??
              app.kyc.annualRevenue ??
              "",
            monthlyRevenue:
              (p.avgMonthlyRevenueRange as string) ??
              app.kyc.monthlyRevenue ??
              "",
            arBalance:
              (p.accountsReceivableRange as string) ?? app.kyc.arBalance ?? "",
            availableCollateral:
              (p.fixedAssetsValueRange as string) ??
              app.kyc.availableCollateral ??
              "",
          },
          business: {
            ...app.business,
            companyName:
              (p.companyName as string) ?? app.business.companyName ?? "",
            businessName:
              (p.companyName as string) ?? app.business.businessName ?? "",
            legalName:
              (p.companyName as string) ?? app.business.legalName ?? "",
          },
          applicant: {
            ...app.applicant,
            fullName: fullName || app.applicant.fullName || "",
            firstName: firstName || app.applicant.firstName || "",
            lastName: lastName || app.applicant.lastName || "",
            email: (p.email as string) ?? app.applicant.email ?? "",
            phone: (p.phone as string) ?? app.applicant.phone ?? phone,
          },
        });
      })
      .catch(() => {
        // best-effort prefill only
      })
      .finally(() => {
        try {
          sessionStorage.removeItem("verified_phone");
        } catch {
          // sessionStorage unavailable — leave the entry; harmless.
        }
      });
    // intentionally run-once: this hydrates from the server on initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const draft = loadStepData(1);
    if (!draft) return;
    const merged = mergeDraft(app.kyc, draft);
    const changed = Object.keys(merged).some(
      (key) => merged[key] !== app.kyc[key]
    );
    if (changed) {
      update({ kyc: merged });
    }
  }, [app.kyc, update]);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillId = params.get("creditReadinessId");
    if (!prefillId) return;

    let active = true;
    void fetchCreditPrefill(prefillId)
      .then((data) => {
        if (!active || !data || typeof data !== "object") return;
        const prefillData = data as Step1KycData;

        const nextKyc = {
          ...app.kyc,
          industry: prefillData.industry ?? app.kyc.industry ?? "",
          yearsInBusiness: prefillData.yearsInBusiness ?? app.kyc.yearsInBusiness ?? "",
          annualRevenue: prefillData.annualRevenue ?? app.kyc.annualRevenue ?? "",
          monthlyRevenue: prefillData.monthlyRevenue ?? app.kyc.monthlyRevenue ?? "",
          arBalance: prefillData.arBalance ?? app.kyc.arBalance ?? "",
          availableCollateral:
            prefillData.availableCollateral ?? app.kyc.availableCollateral ?? "",
          salesHistory: prefillData.yearsInBusiness ?? app.kyc.salesHistory ?? "",
          revenueLast12Months:
            prefillData.annualRevenue ?? app.kyc.revenueLast12Months ?? "",
          accountsReceivable: prefillData.arBalance ?? app.kyc.accountsReceivable ?? "",
          fixedAssets:
            prefillData.availableCollateral ?? app.kyc.fixedAssets ?? "",
          companyName: prefillData.companyName ?? app.kyc.companyName ?? "",
          fullName: prefillData.fullName ?? app.kyc.fullName ?? "",
          email: prefillData.email ?? app.kyc.email ?? "",
          phone: prefillData.phone ?? app.kyc.phone ?? "",
        };

        const fullName = (prefillData.fullName || "").trim();
        const [firstName = "", ...lastNameParts] = fullName.split(/\s+/);
        const lastName = lastNameParts.join(" ");

        update({
          kyc: nextKyc,
          business: {
            ...app.business,
            companyName: prefillData.companyName ?? app.business.companyName ?? "",
            businessName: prefillData.companyName ?? app.business.businessName ?? "",
            legalName: prefillData.companyName ?? app.business.legalName ?? "",
          },
          applicant: {
            ...app.applicant,
            fullName: prefillData.fullName ?? app.applicant.fullName ?? "",
            firstName: firstName || app.applicant.firstName || "",
            lastName: lastName || app.applicant.lastName || "",
            email: prefillData.email ?? app.applicant.email ?? "",
            phone: prefillData.phone ?? app.applicant.phone ?? "",
          },
        });
      })
      .catch(() => {
        // ignore prefill errors
      });

    return () => {
      active = false;
    };
  }, [update]);

  // Block 15: removed broken creditPrefill effect that referenced an out-of-scope `prefillData`

  useEffect(() => {
    const normalized = normalizeFundingIntent(app.kyc.lookingFor);
    if (normalized && normalized !== app.kyc.lookingFor) {
      update({ kyc: { ...app.kyc, lookingFor: normalized } });
    }
  }, [app.kyc, update]);

  useEffect(() => {
    if (showErrors) {
      scrollToFirstError();
    }
  }, [showErrors]);

  // BF_CLIENT_BLOCK_v91_ELIGIBILITY_RULES_AND_STEP1_HARDSTOPS_v1
  function getStepErrors(values: Record<string, any>) {
    const intent = normalizeFundingIntent(values.lookingFor);
    const capitalRequired = intent === "WORKING_CAPITAL" || intent === "BOTH";
    const equipmentRequired = intent === "EQUIPMENT" || intent === "BOTH";
    return {
      lookingFor: !Validate.required(values.lookingFor),
      fundingAmount: capitalRequired && !Validate.required(values.fundingAmount),
      equipmentAmount: equipmentRequired && !Validate.required(values.equipmentAmount),
      businessLocation:
        !Validate.required(values.businessLocation) ||
        values.businessLocation === "Other",
      industry: !Validate.required(values.industry),
      purposeOfFunds: !Validate.required(values.purposeOfFunds),
      salesHistory: !Validate.required(values.salesHistory),
      revenueLast12Months: !Validate.required(values.revenueLast12Months),
      monthlyRevenue:
        !Validate.required(values.monthlyRevenue) ||
        values.monthlyRevenue === "Under $10,000",
      accountsReceivable: !Validate.required(values.accountsReceivable),
      fixedAssets: !Validate.required(values.fixedAssets),
    };
  }

  const fieldErrors = getStepErrors(app.kyc);
  const isValid = Object.values(fieldErrors).every((error) => !error);

  // Expose live state on window for diagnostics — paste `__bfWizard` in console to inspect.
  if (typeof window !== "undefined") {
    (window as any).__bfWizard = {
      kyc: app.kyc,
      applicationToken: app.applicationToken,
      currentStep: app.currentStep,
      isValid,
      fieldErrors,
    };
  }

  const startInFlightRef = useRef(false);
  async function startApplication(kycSnapshot?: typeof app.kyc) {
    console.log("[wizard] startApplication ENTRY", {
      hasSnapshot: Boolean(kycSnapshot),
      inFlight: startInFlightRef.current,
    });
    if (startInFlightRef.current) {
      console.warn("[wizard] startApplication SKIPPED — in-flight guard tripped. Forcing reset in case it was stuck.");
      // Stuck-guard recovery: if we got here with the flag set, clear it so the next
      // click can proceed. The previous attempt either completed or threw past finally.
      startInFlightRef.current = false;
      return;
    }
    startInFlightRef.current = true;
    // Safety timeout: hard-reset the in-flight flag after 10s no matter what.
    const inFlightTimeout = setTimeout(() => {
      if (startInFlightRef.current) {
        console.warn("[wizard] startApplication safety timeout — resetting in-flight flag");
        startInFlightRef.current = false;
      }
    }, 10_000);
    try {
      // Use the caller-supplied snapshot if provided (auto-advance path) so we
      // validate against the just-updated values, not a stale render closure. (Block 15)
      const kyc = kycSnapshot ?? app.kyc;
      console.log("[wizard] Step 1 about to validate", { kyc });
      saveStepData(1, kyc);
      try {
        enforceV1StepSchema("step1", kyc);
      } catch (zodErr) {
        console.error("[wizard] Step 1 ZOD VALIDATION FAILED", { kyc, zodErr });
        throw zodErr;
      }
      console.log("[wizard] Step 1 validation passed");
      const payload = kyc;

      // BF_CLIENT_BLOCK_v110_PARSECURRENCY_GUARD_v1 — Equipment-only flows
      // fill equipmentAmount instead of fundingAmount. Use whichever is set.
      const fundingAmt = parseCurrency(payload.fundingAmount);
      const equipmentAmt = parseCurrency((payload as any).equipmentAmount);
      const resolved =
        !Number.isNaN(fundingAmt) ? fundingAmt :
        !Number.isNaN(equipmentAmt) ? equipmentAmt : 0;
      const amount = resolved;
      const matchPercentages = buildMatchPercentages(amount);
      const payloadBody = {
        financialProfile: payload,
      };
      setSubmitError(null);

      // If we already have a real (UUID) application token from a prior session, reuse it.
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const existingToken = app.applicationToken || applicationId || app.applicationId || null;
      let token: string | null = existingToken && typeof existingToken === "string" && UUID_RE.test(existingToken)
        ? existingToken
        : null;

      if (!token) {
        // BF_STEP1_RESTORED_v25 — Block 25
        // Real server-mint flow. /api/public/application/start completes in ~40ms
        // per Block 20 server diagnostics. Lifecycle logging from Block 21 is
        // preserved so we can see fetch outcomes in the console.
        const __apiBase =
          ((import.meta as any).env?.VITE_API_URL) || 'https://server.boreal.financial';
        const __startUrl = __apiBase + '/api/public/application/start';
        const __startTs = Date.now();
        const __startAbort = new AbortController();
        const __startTimer = setTimeout(() => {
          // eslint-disable-next-line no-console
          console.warn('[wizard] startApplication TIMEOUT — aborting after 20s');
          __startAbort.abort();
        }, 20000);
        // eslint-disable-next-line no-console
        console.log('[wizard] startApplication request begin', { url: __startUrl });

        let startRes: any;
        try {
          // BF_CLIENT_BLOCK_v129b_READINESS_PHONE_AT_START_v1
          // When the wizard mounts after OTP login, sessionStorage has
          // the verified phone (E.164). Send it to /start so the server
          // can claim the orphaned draft application created by the
          // website's credit-readiness submission. If no readiness draft
          // exists for this phone, the server falls through to the
          // normal blank-application mint path.
          let __readinessPhone: string | null = null;
          try {
            __readinessPhone = sessionStorage.getItem("verified_phone");
          } catch {
            // sessionStorage unavailable — continue without claim.
          }
          const __startBody: Record<string, unknown> = { source: 'client_direct' };
          if (__readinessPhone && __readinessPhone.trim()) {
            __startBody.readiness_phone = __readinessPhone.trim();
          }
          const __res = await fetch(__startUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            signal: __startAbort.signal,
            body: JSON.stringify(__startBody),
          });
          const __body = await __res.json().catch(() => ({}));
          if (!__res.ok) {
            // eslint-disable-next-line no-console
            console.error('[wizard] startApplication response', {
              status: __res.status, body: __body, elapsed_ms: Date.now() - __startTs,
            });
            throw new Error('startApplication failed: ' + __res.status);
          }
          // eslint-disable-next-line no-console
          console.log('[wizard] startApplication response', {
            status: __res.status, body: __body, elapsed_ms: Date.now() - __startTs,
          });
          const __token =
            (__body as any)?.applicationToken ??
            (__body as any)?.applicationId ??
            (__body as any)?.id ??
            (__body as any)?.data?.applicationToken ??
            (__body as any)?.data?.applicationId ??
            (__body as any)?.data?.id;
          if (!__token) {
            // eslint-disable-next-line no-console
            console.error('[wizard] startApplication response missing token', __body);
            throw new Error('startApplication response missing token');
          }
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('bf_application_token', String(__token));
            localStorage.removeItem('bf_application_pending_submit');
          }
          startRes = {
            ok: true,
            status: __res.status,
            data: __body,
            applicationToken: __token,
            applicationId: __token,
          };
        } catch (err: any) {
          // eslint-disable-next-line no-console
          console.error('[wizard] startApplication error', {
            name: err?.name, message: err?.message, aborted: err?.name === 'AbortError',
            elapsed_ms: Date.now() - __startTs,
          });
          clearTimeout(__startTimer);
          throw err;
        } finally {
          clearTimeout(__startTimer);
        }

        token = startRes?.applicationToken || startRes?.applicationId || token;
      }

      update({
        applicationToken: token,
        applicationId: token,
        matchPercentages,
        currentStep: 2,
      });
      persistApplicationStep({ ...app, applicationToken: token, applicationId: token }, 1, payloadBody).catch(() => {});
      track("step_completed", { step: 1 });
      console.log("[wizard] Step 1 advancing with real applicationToken", token);
      navigate("/apply/step-2");
    } catch (err) {
      console.error("[wizard] Step 1 unexpected error", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      clearTimeout(inFlightTimeout);
      startInFlightRef.current = false;
      console.log("[wizard] startApplication EXIT — flag cleared");
    }
  }



  const fieldGridStyle = {
    display: "grid",
    gridTemplateColumns:
      typeof window !== "undefined" && window.innerWidth < 600
        ? "1fr"
        : "1fr 1fr",
    gap: tokens.spacing.md,
  };

  const focusField = (fieldKey: string) => {
    const id = getWizardFieldId("step1", fieldKey);
    const element = document.getElementById(id) as HTMLElement | null;
    element?.focus();
  };

  const handleAutoAdvance = (
    currentKey: string,
    nextValues: Record<string, any>
  ) => {
    const context = { kyc: nextValues };
    const nextKey = getNextFieldKey("step1", currentKey, context);
    if (nextKey) {
      requestAnimationFrame(() => focusField(nextKey));
      return;
    }
    const nextErrors = getStepErrors(nextValues);
    const nextIsValid = Object.values(nextErrors).every((error) => !error);
    if (nextIsValid) {
      void startApplication(nextValues);
    }
  };

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          background: "#f3f4f6",
          padding: "0 0 48px",
        }}
      >
        <div style={{ height: 4, background: "#e5e7eb", width: "100%" }}>
          <div
            style={{
              height: 4,
              background: "#2563eb",
              width: `${(1 / 6) * 100}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 0" }}>
          <style>{`.wizard-step-shell label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px}.wizard-step-shell input,.wizard-step-shell select{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;box-sizing:border-box}.wizard-step-shell select{appearance:none;cursor:pointer}`}</style>
      <WizardLayout>
      <div className="wizard-step-shell">
        <StepHeader step={1} title="Financial Profile" />
        {submitError && (
          <Card variant="muted" data-error={true}>
            <div style={components.form.errorText}>{submitError}</div>
          </Card>
        )}
        {autosaveError && (
          <Card
            variant="muted"
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              color: tokens.colors.textPrimary,
            }}
          >
            {autosaveError}
          </Card>
        )}
        {sessionExpired && (
          <Card
            variant="muted"
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              color: tokens.colors.textPrimary,
            }}
          >
            Your previous session expired. Please start again — we kept things short.
          </Card>
        )}
        <Card
          style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}
          onBlurCapture={() => saveStepData(1, app.kyc)}
        >
          <div style={fieldGridStyle}>
            <div data-error={showErrors && fieldErrors.lookingFor}>
              <label style={components.form.label}>What are you looking for?</label>
              <Select
                id={getWizardFieldId("step1", "lookingFor")}
                value={normalizeFundingIntent(app.kyc.lookingFor) || ""}
                onChange={(e: unknown) => {
                  const nextIntent = normalizeFundingIntent(e.target.value);
                  const nextKyc = { ...app.kyc, lookingFor: nextIntent };
                  update({
                    kyc: nextKyc,
                    productCategory: null,
                    selectedProduct: undefined,
                    selectedProductId: undefined,
                    selectedProductType: undefined,
                    requires_closing_cost_funding: undefined,
                    eligibleProducts: [],
                    eligibleCategories: [],
                    eligibilityReasons: [],
                  });
                  handleAutoAdvance("lookingFor", nextKyc);
                }}
                hasError={showErrors && fieldErrors.lookingFor}
              >
                <option value="">Select…</option>
                {FUNDING_INTENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {showErrors && fieldErrors.lookingFor && (
                <div style={components.form.errorText}>Please select a funding intent.</div>
              )}
            </div>
            {/* BF_CLIENT_BLOCK_v91_ELIGIBILITY_RULES_AND_STEP1_HARDSTOPS_v1 */}
            {(() => {
              const intent = normalizeFundingIntent(app.kyc.lookingFor);
              if (intent === "EQUIPMENT") {
                return (
                  <div data-error={showErrors && fieldErrors.equipmentAmount}>
                    <label style={components.form.label}>How much equipment financing are you seeking?</label>
                    <Input id={getWizardFieldId("step1", "equipmentAmount")} inputMode="decimal" value={(app.kyc as any).equipmentAmount || ""} onChange={(e: unknown) => { const nextKyc = { ...app.kyc, equipmentAmount: sanitizeCurrencyInput(e.target.value) }; update({ kyc: nextKyc }); }} onBlur={() => { if (!(app.kyc as any).equipmentAmount) return; const nextKyc = { ...app.kyc, equipmentAmount: formatCurrencyValue((app.kyc as any).equipmentAmount, countryCode) }; update({ kyc: nextKyc }); handleAutoAdvance("equipmentAmount", nextKyc); }} hasError={showErrors && fieldErrors.equipmentAmount} placeholder={countryCode === "CA" ? "CA$" : "$"} />
                    {showErrors && fieldErrors.equipmentAmount && (<div style={components.form.errorText}>Please enter an equipment amount.</div>)}
                  </div>
                );
              }
              if (intent === "BOTH") {
                return (<>
                              <div data-error={showErrors && fieldErrors.fundingAmount}>
              <label style={components.form.label}>How much funding are you seeking?</label>
              <Input
                id={getWizardFieldId("step1", "fundingAmount")}
                inputMode="decimal"
                value={app.kyc.fundingAmount || ""}
                onChange={(e: unknown) => {
                  const nextKyc = {
                    ...app.kyc,
                    fundingAmount: sanitizeCurrencyInput(e.target.value),
                  };
                  update({
                    kyc: nextKyc,
                    productCategory: null,
                    selectedProduct: undefined,
                    selectedProductId: undefined,
                    selectedProductType: undefined,
                    requires_closing_cost_funding: undefined,
                    eligibleProducts: [],
                    eligibleCategories: [],
                    eligibilityReasons: [],
                  });
                }}
                onBlur={() => {
                  if (!app.kyc.fundingAmount) return;
                  const formatted = formatCurrencyValue(
                    app.kyc.fundingAmount,
                    countryCode
                  );
                  const nextKyc = { ...app.kyc, fundingAmount: formatted };
                  update({ kyc: nextKyc });
                  handleAutoAdvance("fundingAmount", nextKyc);
                }}
                onKeyDown={(e: unknown) => {
                  if (e.key === "Enter") {
                    const nextKyc = {
                      ...app.kyc,
                      fundingAmount: formatCurrencyValue(
                        app.kyc.fundingAmount || "",
                        countryCode
                      ),
                    };
                    update({ kyc: nextKyc });
                    handleAutoAdvance("fundingAmount", nextKyc);
                  }
                }}
                placeholder={countryCode === "CA" ? "CA$" : "$"}
                hasError={showErrors && fieldErrors.fundingAmount}
              />
              {showErrors && fieldErrors.fundingAmount && (
                <div style={components.form.errorText}>Enter a funding amount.</div>
              )}
            </div>
                  <div data-error={showErrors && fieldErrors.equipmentAmount}>
                    <label style={components.form.label}>Equipment amount</label>
                    <Input id={getWizardFieldId("step1", "equipmentAmount")} inputMode="decimal" value={(app.kyc as any).equipmentAmount || ""} onChange={(e: unknown) => { const nextKyc = { ...app.kyc, equipmentAmount: sanitizeCurrencyInput(e.target.value) }; update({ kyc: nextKyc }); }} onBlur={() => { if (!(app.kyc as any).equipmentAmount) return; const nextKyc = { ...app.kyc, equipmentAmount: formatCurrencyValue((app.kyc as any).equipmentAmount, countryCode) }; update({ kyc: nextKyc }); handleAutoAdvance("equipmentAmount", nextKyc); }} hasError={showErrors && fieldErrors.equipmentAmount} placeholder={countryCode === "CA" ? "CA$" : "$"} />
                    {showErrors && fieldErrors.equipmentAmount && (<div style={components.form.errorText}>Please enter an equipment amount.</div>)}
                  </div>
                </>);
              }
              return (<>            <div data-error={showErrors && fieldErrors.fundingAmount}>
              <label style={components.form.label}>How much funding are you seeking?</label>
              <Input
                id={getWizardFieldId("step1", "fundingAmount")}
                inputMode="decimal"
                value={app.kyc.fundingAmount || ""}
                onChange={(e: unknown) => {
                  const nextKyc = {
                    ...app.kyc,
                    fundingAmount: sanitizeCurrencyInput(e.target.value),
                  };
                  update({
                    kyc: nextKyc,
                    productCategory: null,
                    selectedProduct: undefined,
                    selectedProductId: undefined,
                    selectedProductType: undefined,
                    requires_closing_cost_funding: undefined,
                    eligibleProducts: [],
                    eligibleCategories: [],
                    eligibilityReasons: [],
                  });
                }}
                onBlur={() => {
                  if (!app.kyc.fundingAmount) return;
                  const formatted = formatCurrencyValue(
                    app.kyc.fundingAmount,
                    countryCode
                  );
                  const nextKyc = { ...app.kyc, fundingAmount: formatted };
                  update({ kyc: nextKyc });
                  handleAutoAdvance("fundingAmount", nextKyc);
                }}
                onKeyDown={(e: unknown) => {
                  if (e.key === "Enter") {
                    const nextKyc = {
                      ...app.kyc,
                      fundingAmount: formatCurrencyValue(
                        app.kyc.fundingAmount || "",
                        countryCode
                      ),
                    };
                    update({ kyc: nextKyc });
                    handleAutoAdvance("fundingAmount", nextKyc);
                  }
                }}
                placeholder={countryCode === "CA" ? "CA$" : "$"}
                hasError={showErrors && fieldErrors.fundingAmount}
              />
              {showErrors && fieldErrors.fundingAmount && (
                <div style={components.form.errorText}>Enter a funding amount.</div>
              )}
            </div></>);
            })()}

            <div data-error={showErrors && fieldErrors.businessLocation}>
              <label style={components.form.label}>Business Location</label>
              <Select
                id={getWizardFieldId("step1", "businessLocation")}
                value={app.kyc.businessLocation || ""}
                onChange={(e: unknown) => {
                  const value = e.target.value;
                  const nextKyc = { ...app.kyc, businessLocation: value };
                  update({
                    kyc: nextKyc,
                    productCategory: null,
                    selectedProduct: undefined,
                    selectedProductId: undefined,
                    selectedProductType: undefined,
                    requires_closing_cost_funding: undefined,
                    eligibleProducts: [],
                    eligibleCategories: [],
                    eligibilityReasons: [],
                  });
                  if (value === "Other") {
                    setShowLocationModal(true);
                    return;
                  }
                  handleAutoAdvance("businessLocation", nextKyc);
                }}
                hasError={showErrors && fieldErrors.businessLocation}
              >
                <option value="">Select…</option>
                {BusinessLocationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              {showErrors && fieldErrors.businessLocation && (
                <div style={components.form.errorText}>
                  Please choose Canada or the United States.
                </div>
              )}
            </div>

            <div data-error={showErrors && fieldErrors.industry}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                Industry *
              </label>
              <select
                id={getWizardFieldId("step1", "industry")}
                value={app.kyc.industry || ""}
                onChange={(e) => {
                  const nextKyc = { ...app.kyc, industry: e.target.value };
                  update({ kyc: nextKyc });
                  handleAutoAdvance("industry", nextKyc);
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 14,
                  color: "#111827",
                  background: "#fff",
                  boxSizing: "border-box",
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                {/* BF_CLIENT_v66_STEP1_INDUSTRIES — expanded to better
                    cover SMB lending demand. New entries are inserted in
                    alphabetical position; "Other" remains last. */}
                <option value="">Select industry...</option>
                <option>Agriculture</option>
                <option>Auto Sales &amp; Repair</option>
                <option>Construction</option>
                <option>Education</option>
                <option>Energy</option>
                <option>Healthcare</option>
                <option>Hospitality &amp; Lodging</option>
                <option>Logistics &amp; Trucking</option>
                <option>Manufacturing</option>
                <option>Personal Services</option>
                <option>Professional Services</option>
                <option>Real Estate</option>
                <option>Restaurant/Food Service</option>
                <option>Retail</option>
                <option>Technology</option>
                <option>Transportation</option>
                <option>Wholesale &amp; Distribution</option>
                <option>Other</option>
              </select>
              {showErrors && fieldErrors.industry && (
                <div style={components.form.errorText}>Select your industry.</div>
              )}
            </div>

            <div data-error={showErrors && fieldErrors.purposeOfFunds}>
              <label style={components.form.label}>Purpose of funds</label>
              <Select
                id={getWizardFieldId("step1", "purposeOfFunds")}
                value={app.kyc.purposeOfFunds || ""}
                onChange={(e: unknown) => {
                  const nextKyc = { ...app.kyc, purposeOfFunds: e.target.value };
                  update({ kyc: nextKyc });
                  handleAutoAdvance("purposeOfFunds", nextKyc);
                }}
                hasError={showErrors && fieldErrors.purposeOfFunds}
              >
                <option value="">Select…</option>
                {visiblePurposeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              {showErrors && fieldErrors.purposeOfFunds && (
                <div style={components.form.errorText}>Select a purpose of funds.</div>
              )}
            </div>

            <div data-error={showErrors && fieldErrors.salesHistory}>
              <label style={components.form.label}>Years of sales history</label>
              <Select
                id={getWizardFieldId("step1", "salesHistory")}
                value={app.kyc.yearsInBusiness || app.kyc.salesHistory || ""}
                onChange={(e: unknown) => {
                  const nextKyc = {
                    ...app.kyc,
                    yearsInBusiness: e.target.value,
                    salesHistory: e.target.value,
                  };
                  update({ kyc: nextKyc });
                  handleAutoAdvance("salesHistory", nextKyc);
                }}
                hasError={showErrors && fieldErrors.salesHistory}
              >
                <option value="">Years in business</option>
                {visibleSalesHistoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              {showErrors && fieldErrors.salesHistory && (
                <div style={components.form.errorText}>Select sales history.</div>
              )}
            </div>
            <div data-error={showErrors && fieldErrors.revenueLast12Months}>
              <label style={components.form.label}>Revenue last 12 months</label>
              <Select
                id={getWizardFieldId("step1", "revenueLast12Months")}
                value={app.kyc.annualRevenue || app.kyc.revenueLast12Months || ""}
                onChange={(e: unknown) => {
                  const nextKyc = {
                    ...app.kyc,
                    annualRevenue: e.target.value,
                    revenueLast12Months: e.target.value,
                  };
                  update({ kyc: nextKyc });
                  handleAutoAdvance("revenueLast12Months", nextKyc);
                }}
                hasError={showErrors && fieldErrors.revenueLast12Months}
              >
                <option value="">Annual revenue</option>
                {RevenueOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              {showErrors && fieldErrors.revenueLast12Months && (
                <div style={components.form.errorText}>Select a revenue range.</div>
              )}
            </div>
            <div data-error={showErrors && fieldErrors.monthlyRevenue}>
              <label style={components.form.label}>
                Avg monthly revenue (last 3 months)
              </label>
              <Select
                id={getWizardFieldId("step1", "monthlyRevenue")}
                value={app.kyc.monthlyRevenue || ""}
                onChange={(e: unknown) => {
                  const value = e.target.value;
                  if (value === "Under $10,000") {
                    setShowMinRevenueModal(true);
                    update({ kyc: { ...app.kyc, monthlyRevenue: "" } });
                    return;
                  }
                  const nextKyc = { ...app.kyc, monthlyRevenue: value };
                  update({ kyc: nextKyc });
                  handleAutoAdvance("monthlyRevenue", nextKyc);
                }}
                hasError={showErrors && fieldErrors.monthlyRevenue}
              >
                <option value="">Average monthly revenue</option>
                {MonthlyRevenueOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              {showErrors && fieldErrors.monthlyRevenue && (
                <div style={components.form.errorText}>Select monthly revenue.</div>
              )}
            </div>
              <div data-error={showErrors && fieldErrors.accountsReceivable}>
                <label style={components.form.label}>Current AR balance</label>
                <Select
                  id={getWizardFieldId("step1", "accountsReceivable")}
                  value={app.kyc.arBalance || app.kyc.accountsReceivable || ""}
                  onChange={(e: unknown) => {
                    const nextKyc = {
                      ...app.kyc,
                      arBalance: e.target.value,
                      accountsReceivable: e.target.value,
                    };
                    update({
                      kyc: nextKyc,
                      productCategory: null,
                      selectedProduct: undefined,
                      selectedProductId: undefined,
                      selectedProductType: undefined,
                      eligibleProducts: [],
                      eligibleCategories: [],
                      eligibilityReasons: [],
                    });
                    handleAutoAdvance("accountsReceivable", nextKyc);
                  }}
                  hasError={showErrors && fieldErrors.accountsReceivable}
                >
                  <option value="">Account Receivables</option>
                  {AccountsReceivableOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                {showErrors && fieldErrors.accountsReceivable && (
                  <div style={components.form.errorText}>
                    Select an AR balance.
                  </div>
                )}
              </div>

              <div data-error={showErrors && fieldErrors.fixedAssets}>
                <label style={components.form.label}>Fixed assets value for loan security</label>
                <Select
                  id={getWizardFieldId("step1", "fixedAssets")}
                  value={app.kyc.availableCollateral || app.kyc.fixedAssets || ""}
                  onChange={(e: unknown) => {
                    const nextKyc = {
                      ...app.kyc,
                      availableCollateral: e.target.value,
                      fixedAssets: e.target.value,
                    };
                    update({ kyc: nextKyc });
                    handleAutoAdvance("fixedAssets", nextKyc);
                  }}
                  hasError={showErrors && fieldErrors.fixedAssets}
                >
                  <option value="">Available collateral</option>
                  {FixedAssetsOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                {showErrors && fieldErrors.fixedAssets && (
                  <div style={components.form.errorText}>
                    Select a collateral range.
                  </div>
                )}
              </div>
          </div>
        </Card>

        <div style={{ ...layout.stickyCta, marginTop: tokens.spacing.lg }}>
          <Button
            style={{ width: "100%", maxWidth: "220px" }}
            onClick={() => {
              console.log("[wizard] Continue clicked", {
                isValid,
                fieldErrors,
                kycSnapshot: app.kyc,
                inFlight: startInFlightRef.current,
                applicationToken: app.applicationToken ?? null,
              });
              setShowErrors(true);
              if (!isValid) {
                console.warn("[wizard] Continue blocked by isValid=false");
                return;
              }
              setShowErrors(false);
              void startApplication();
            }}
            disabled={!isValid}
          >
            Continue →
          </Button>
        </div>
      </div>
      </WizardLayout>
      </div>
      </div>

      {showLocationModal && (
        <div className="wizard-modal-backdrop" role="dialog" aria-modal="true">
          <div className="wizard-modal">
            <h3>Sorry, we can't help you</h3>
            <p>At this time we only fund corporations registered in either Canada or the United States.</p>
          </div>
        </div>
      )}
      {showMinRevenueModal && (
        <div className="wizard-modal-backdrop" role="dialog" aria-modal="true">
          <div className="wizard-modal">
            <h3>Revenue threshold not met</h3>
            <p>Your business does not currently meet our minimum monthly revenue threshold. Please reach out once revenue has grown.</p>
          </div>
        </div>
      )}
    </>
  );
}

export default Step1_KYC;
