// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
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


const PurposeOptions = [
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

const MonthlyRevenueOptions = [
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

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, "");
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
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const countryCode = useMemo(
    () => getCountryCode(app.kyc.businessLocation),
    [app.kyc.businessLocation]
  );
  const sessionExpired = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("reason") === "session_expired";
  }, []);
  useEffect(() => {
    if (app.currentStep !== 1) {
      update({ currentStep: 1 });
    }
  }, [app.currentStep, update]);

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
      kyc: nextKyc,
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
    const token = sessionStorage.getItem("readiness_token");
    if (!token) return;

    void fetchReadinessPrefill(token)
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

  useEffect(() => {
    const stored = localStorage.getItem("creditPrefill");
    if (!stored) return;

    try {
      const data = JSON.parse(stored) as Record<string, string>;
      const nextKyc = {
        ...app.kyc,
        industry: prefillData.industry || app.kyc.industry || "",
        yearsInBusiness: prefillData.yearsInBusiness || app.kyc.yearsInBusiness || "",
        salesHistory: prefillData.yearsInBusiness || app.kyc.salesHistory || "",
        annualRevenue: prefillData.annualRevenue || app.kyc.annualRevenue || "",
        revenueLast12Months: prefillData.annualRevenue || app.kyc.revenueLast12Months || "",
        monthlyRevenue: prefillData.monthlyRevenue || app.kyc.monthlyRevenue || "",
        arBalance: prefillData.arBalance || app.kyc.arBalance || "",
        accountsReceivable: prefillData.arBalance || app.kyc.accountsReceivable || "",
        availableCollateral:
          prefillData.availableCollateral || data.collateralAvailable || app.kyc.availableCollateral || "",
        fixedAssets:
          prefillData.availableCollateral || data.collateralAvailable || app.kyc.fixedAssets || "",
      };

      const changed =
        nextKyc.industry !== app.kyc.industry ||
        nextKyc.salesHistory !== app.kyc.salesHistory ||
        nextKyc.yearsInBusiness !== app.kyc.yearsInBusiness ||
        nextKyc.revenueLast12Months !== app.kyc.revenueLast12Months ||
        nextKyc.annualRevenue !== app.kyc.annualRevenue ||
        nextKyc.monthlyRevenue !== app.kyc.monthlyRevenue ||
        nextKyc.arBalance !== app.kyc.arBalance ||
        nextKyc.accountsReceivable !== app.kyc.accountsReceivable ||
        nextKyc.availableCollateral !== app.kyc.availableCollateral ||
        nextKyc.fixedAssets !== app.kyc.fixedAssets;

      if (changed) {
        update({ kyc: nextKyc });
      }
    } catch {
      // ignore malformed prefill payload
    }
  }, [app.kyc, update]);

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

  function getStepErrors(values: Record<string, any>) {
    return {
      lookingFor: !Validate.required(values.lookingFor),
      fundingAmount: !Validate.required(values.fundingAmount),
      businessLocation:
        !Validate.required(values.businessLocation) ||
        values.businessLocation === "Other",
      industry: !Validate.required(values.industry),
      purposeOfFunds: !Validate.required(values.purposeOfFunds),
      salesHistory: !Validate.required(values.salesHistory),
      revenueLast12Months: !Validate.required(values.revenueLast12Months),
      monthlyRevenue: !Validate.required(values.monthlyRevenue),
      accountsReceivable: !Validate.required(values.accountsReceivable),
      fixedAssets: !Validate.required(values.fixedAssets),
    };
  }

  const fieldErrors = getStepErrors(app.kyc);
  const isValid = Object.values(fieldErrors).every((error) => !error);

  async function startApplication() {
    try {
      saveStepData(1, app.kyc);
      enforceV1StepSchema("step1", app.kyc);
      const payload = app.kyc;

      const amount = parseCurrency(payload.fundingAmount);
      const matchPercentages = buildMatchPercentages(
        Number.isNaN(amount) ? 0 : amount
      );
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
        try {
          // Use the public draft-mint endpoint. POST /api/public/application/start
          // accepts an empty body and returns { status: "ok", data: { applicationId } }.
          // The wizard then PATCHes /api/client/applications/:id on each subsequent step.
          const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) || "https://server.boreal.financial";
          const startRes = await fetch(`${baseUrl}/api/public/application/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: "client_direct" }),
          });
          if (!startRes.ok) {
            console.error("[wizard] /api/public/application/start failed", { status: startRes.status });
            setSubmitError("We couldn't start your application. Please check your connection and try again.");
            return;
          }
          const startBody = await startRes.json().catch(() => null);
          token =
            (startBody?.data?.applicationId as string | undefined) ||
            (startBody?.applicationId as string | undefined) ||
            null;
        } catch (err) {
          console.error("[wizard] Step 1 application/start request failed", err);
          setSubmitError("We couldn't start your application. Please check your connection and try again.");
          return;
        }

        if (!token || !UUID_RE.test(token)) {
          console.error("[wizard] Step 1 server did not return a valid application UUID", { token });
          setSubmitError("We couldn't start your application. Please try again in a moment.");
          return;
        }
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
      void startApplication();
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
                <option value="">Select industry...</option>
                <option>Construction</option>
                <option>Manufacturing</option>
                <option>Retail</option>
                <option>Restaurant/Food Service</option>
                <option>Technology</option>
                <option>Healthcare</option>
                <option>Transportation</option>
                <option>Professional Services</option>
                <option>Real Estate</option>
                <option>Agriculture</option>
                <option>Energy</option>
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
                {PurposeOptions.map((option) => (
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
                {SalesHistoryOptions.map((option) => (
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
                  const nextKyc = { ...app.kyc, monthlyRevenue: e.target.value };
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
              setShowErrors(true);
              if (!isValid) return;
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
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: tokens.spacing.md,
            zIndex: 50,
          }}
        >
          <div
            style={{
              ...components.card.base,
              maxWidth: "420px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: tokens.spacing.sm,
            }}
          >
            <h2 style={components.form.sectionTitle}>Funding availability</h2>
            <p style={components.form.subtitle}>
              Boreal funding is currently limited to businesses located in
              Canada or the United States.
            </p>
            <Button style={{ width: "100%" }} onClick={() => setShowLocationModal(false)}>
              OK
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default Step1_KYC;
