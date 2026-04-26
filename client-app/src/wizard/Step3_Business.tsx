// @ts-nocheck
if (typeof console !== "undefined") console.log("[wizard] Step3_Business module evaluated");
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApplicationStore } from "../state/useApplicationStore";
import { ClientAppAPI } from "../api/clientApp";
import { StepHeader } from "../components/StepHeader";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { RegionSelect } from "../components/RegionSelect";
import { Validate } from "../utils/validate";
import {
  formatCurrencyValue,
  formatPostalCode,
  formatPhoneNumber,
  getCountryCode,
  getPostalLabel,
  getRegionLabel,
  sanitizeCurrencyInput,
} from "../utils/location";
import { WizardLayout } from "../components/WizardLayout";
import { PhoneInput } from "../components/ui/PhoneInput";
import { components, layout, tokens } from "@/styles";
import { resolveStepGuard } from "./stepGuard";
import { track } from "../utils/track";
import { trackEvent } from "../utils/analytics";
import { loadStepData, mergeDraft, saveStepData } from "../client/autosave";
import { AddressAutocompleteInput } from "../components/ui/AddressAutocompleteInput";
import {
  getNextEmptyFieldKey,
  getNextFieldKey,
  getWizardFieldId,
} from "./wizardSchema";
import { enforceV1StepSchema } from "../schemas/v1WizardSchema";
import { shouldAutoAdvance } from "../utils/autoadvance";
import { persistApplicationStep } from "./saveStepProgress";

export function Step3_Business() {
  const { app, update, autosaveError } = useApplicationStore();
  console.log("[wizard] Step3_Business RENDER", { currentStep: app.currentStep, applicationToken: app.applicationToken, businessLocation: app.kyc?.businessLocation });
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);

  const values = { ...app.business };
  const countryCode = useMemo(
    () => getCountryCode(app.kyc?.businessLocation),
    [app.kyc?.businessLocation]
  );
  const regionLabel = getRegionLabel(countryCode);
  const postalLabel = getPostalLabel(countryCode);
  const regionCountry = useMemo<"CA" | "US">(
    () => (countryCode === "CA" ? "CA" : "US"),
    [countryCode]
  );

  useEffect(() => {
    console.log("[wizard] Step3_Business MOUNTED effect ran", { currentStep: app.currentStep });
    if (app.currentStep !== 3) {
      update({ currentStep: 3 });
    }
  }, [app.currentStep, update]);

  useEffect(() => {
    trackEvent("client_step_viewed", { step: 3 });
  }, []);

  // [removed] resolveStepGuard effect — caused step transition races

  useEffect(() => {
    const draft = loadStepData(3);
    if (!draft) return;
    const merged = mergeDraft(values, draft);
    const changed = Object.keys(merged).some(
      (key) => merged[key] !== values[key]
    );
    if (changed) {
      update({ business: merged });
    }
  }, [update, values]);


  useEffect(() => {
    const stored = localStorage.getItem("creditPrefill");
    if (!stored) return;

    try {
      const data = JSON.parse(stored) as Record<string, string>;
      const companyName = data.companyName || "";
      if (!companyName) return;

      const nextBusiness = {
        ...values,
        companyName: values.companyName || companyName,
        businessName: values.businessName || companyName,
        legalName: values.legalName || companyName,
      };

      if (
        nextBusiness.companyName !== values.companyName ||
        nextBusiness.businessName !== values.businessName ||
        nextBusiness.legalName !== values.legalName
      ) {
        update({ business: nextBusiness });
      }
    } catch {
      // ignore malformed prefill payload
    }
  }, [update, values]);

  function setField(key: string, value: unknown) {
    update({ business: { ...values, [key]: value } });
  }

  const isBusinessNameLocked = false;
  const isLegalNameLocked = false;
  const isCompanyNameLocked = false;
  const isBusinessPhoneLocked = false;

  const isValid = [
    "companyName",
    "businessName",
    "legalName",
    "businessStructure",
    "address",
    "city",
    "state",
    "zip",
    "phone",
    "startDate",
    "employees",
    "estimatedRevenue",
  ].every((field) => Validate.required(values[field]));

  async function next() {
    saveStepData(3, values);
    enforceV1StepSchema("step3", values);
    const requiredFields = [
      "companyName",
      "businessName",
      "legalName",
      "businessStructure",
      "address",
      "city",
      "state",
      "zip",
      "phone",
      "startDate",
      "employees",
      "estimatedRevenue",
    ];

    const missing = requiredFields.find(
      (field) => !Validate.required(values[field])
    );
    if (missing) {
      setSaveError("Please complete all required business details.");
      return;
    }

    try {
      if (app.applicationToken) {
        await ClientAppAPI.update(app.applicationToken, { business: values });
      }
      await persistApplicationStep(app, 3, { business: values });
      setSaveError(null);
    } catch {
      setSaveError("We couldn't save your business details. Please try again.");
      return;
    }
    track("step_completed", { step: 3 });
    update({ currentStep: 4 });
    navigate("/apply/step-4");
  }

  const fieldValues = {
    companyName: values.companyName,
    businessName: values.businessName,
    legalName: values.legalName,
    businessStructure: values.businessStructure,
    address: values.address,
    city: values.city,
    state: values.state,
    zip: values.zip,
    phone: values.phone,
    website: values.website,
    startDate: values.startDate,
    employees: values.employees,
    estimatedRevenue: values.estimatedRevenue,
  };

  const focusField = (fieldKey: string) => {
    const id = getWizardFieldId("step3", fieldKey);
    const element = document.getElementById(id) as HTMLElement | null;
    element?.focus();
  };

  const isStepValid = (nextValues: typeof values) =>
    [
      "companyName",
      "businessName",
      "legalName",
      "businessStructure",
      "address",
      "city",
      "state",
      "zip",
      "phone",
      "startDate",
      "employees",
      "estimatedRevenue",
    ].every((field) => Validate.required(nextValues[field]));

  const handleAutoAdvance = (
    currentKey: string,
    nextValues: typeof values,
    preferEmpty = false
  ) => {
    const context = { business: nextValues };
    const nextKey = preferEmpty
      ? getNextEmptyFieldKey("step3", currentKey, context, {
          ...fieldValues,
          ...nextValues,
        })
      : getNextFieldKey("step3", currentKey, context);
    if (nextKey) {
      requestAnimationFrame(() => focusField(nextKey));
      return;
    }
    if (isStepValid(nextValues)) {
      void next();
    }
  };

  return (
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
            width: `${(3 / 6) * 100}%`,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 0" }}>
        <h1 style={{ color: "#2563eb", fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          Step 3: Business Details
        </h1>
        <p style={{ color: "#6b7280", textAlign: "center", marginBottom: 32, fontSize: 15 }}>
          Provide your core business details.
        </p>
        <style>{`.wizard-step-shell label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px}.wizard-step-shell input,.wizard-step-shell select{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;box-sizing:border-box}.wizard-step-shell select{appearance:none;cursor:pointer}`}</style>
    <WizardLayout>
      <div className="wizard-step-shell">
      <StepHeader step={3} title="Business Details" />
      {saveError && (
        <Card variant="muted" data-error={true}>
          <div style={components.form.errorText}>{saveError}</div>
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
      <StepHeader step={3} title="Business Details" />

      <Card
        style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}
        onBlurCapture={() => saveStepData(3, values)}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              typeof window !== "undefined" && window.innerWidth < 600
                ? "1fr"
                : "1fr 1fr",
            gap: tokens.spacing.md,
          }}
        >
          <div>
            <label style={components.form.label}>Company Name</label>
            <Input
              id={getWizardFieldId("step3", "companyName")}
              value={values.companyName || ""}
              onChange={(e: unknown) => {
                const companyName = e.target.value;
                const nextValues = {
                  ...values,
                  companyName,
                  businessName: values.businessName || companyName,
                  legalName: values.legalName || companyName,
                };
                update({ business: nextValues });
              }}
              disabled={isCompanyNameLocked}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("companyName", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>Business Name (DBA)</label>
            <Input
              id={getWizardFieldId("step3", "businessName")}
              value={values.businessName || ""}
              onChange={(e: unknown) => setField("businessName", e.target.value)}
              disabled={isBusinessNameLocked}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("businessName", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>Business Legal Name</label>
            <Input
              id={getWizardFieldId("step3", "legalName")}
              value={values.legalName || ""}
              onChange={(e: unknown) => setField("legalName", e.target.value)}
              disabled={isLegalNameLocked}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("legalName", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>Business Structure</label>
            <Select
              id={getWizardFieldId("step3", "businessStructure")}
              value={values.businessStructure || ""}
              onChange={(e: unknown) => {
                const nextValues = {
                  ...values,
                  businessStructure: e.target.value,
                };
                update({ business: nextValues });
                handleAutoAdvance("businessStructure", nextValues);
              }}
            >
              <option value="">Select…</option>
              <option value="Sole Proprietorship">Sole Proprietorship</option>
              <option value="Partnership">Partnership</option>
              <option value="LLC">LLC</option>
              <option value="Corporation">Corporation</option>
              <option value="S Corporation">S Corporation</option>
              <option value="Non-Profit">Non-Profit</option>
            </Select>
          </div>

          <div>
            <label style={components.form.label}>Business Address</label>
            <AddressAutocompleteInput
              id={getWizardFieldId("step3", "address")}
              country={regionCountry}
              value={values.address || ""}
              onChange={(e: unknown) => setField("address", e.target.value)}
              onSelect={(selection) => {
                if (!("street" in selection)) return;
                const nextValues = {
                  ...values,
                  address: selection.street || values.address,
                  city: selection.city || values.city,
                  state: selection.state || values.state,
                  zip: formatPostalCode(
                    selection.postalCode || values.zip || "",
                    countryCode
                  ),
                };
                update({ business: nextValues });
                if (shouldAutoAdvance("address", nextValues.address)) {
                  handleAutoAdvance("address", nextValues, true);
                }
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("address", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>City</label>
            <Input
              id={getWizardFieldId("step3", "city")}
              value={values.city || ""}
              onChange={(e: unknown) => setField("city", e.target.value)}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("city", values);
                }
              }}
            />
          </div>
          <div>
            <label style={components.form.label}>{regionLabel}</label>
            <RegionSelect
              country={regionCountry}
              value={values.state || ""}
              id={getWizardFieldId("step3", "state")}
              onChange={(value) => {
                const nextValues = { ...values, state: value };
                update({ business: nextValues });
                handleAutoAdvance("state", nextValues);
              }}
            />
          </div>
          <div>
            <label style={components.form.label}>{postalLabel}</label>
            <Input
              id={getWizardFieldId("step3", "zip")}
              value={formatPostalCode(values.zip || "", countryCode)}
              onChange={(e: unknown) => {
                const nextValues = {
                  ...values,
                  zip: formatPostalCode(e.target.value, countryCode),
                };
                update({ business: nextValues });
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("zip", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>Business Phone</label>
            <PhoneInput
              id={getWizardFieldId("step3", "phone")}
              value={formatPhoneNumber(values.phone || "", countryCode)}
              onChange={(e: unknown) => {
                const nextValues = {
                  ...values,
                  phone: formatPhoneNumber(e.target.value, countryCode),
                };
                update({ business: nextValues });
              }}
              disabled={isBusinessPhoneLocked}
              onBlur={() => handleAutoAdvance("phone", values)}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("phone", values);
                }
              }}
              placeholder="(555) 555-5555"
            />
          </div>

          <div>
            <label style={components.form.label}>Business Website</label>
            <Input
              id={getWizardFieldId("step3", "website")}
              type="url"
              value={values.website || ""}
              onChange={(e: unknown) => setField("website", e.target.value)}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("website", values);
                }
              }}
              placeholder="https://"
            />
          </div>

          <div>
            <label style={components.form.label}>Business Start Date</label>
            <Input
              id={getWizardFieldId("step3", "startDate")}
              type="date"
              value={values.startDate || ""}
              onChange={(e: unknown) => setField("startDate", e.target.value)}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("startDate", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>Number of Employees</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontSize: 18,
                }}
                onClick={() =>
                  setField(
                    "employees",
                    Math.max(0, Number(values.employees || 0) - 1)
                  )
                }
                type="button"
              >
                −
              </button>
              <span style={{ minWidth: 40, textAlign: "center", fontSize: 16, fontWeight: 500 }}>
                {Number(values.employees || 0)}
              </span>
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontSize: 18,
                }}
                onClick={() =>
                  setField("employees", Number(values.employees || 0) + 1)
                }
                type="button"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label style={components.form.label}>Estimated Yearly Revenue</label>
            <Input
              id={getWizardFieldId("step3", "estimatedRevenue")}
              inputMode="decimal"
              value={values.estimatedRevenue || ""}
              onChange={(e: unknown) => {
                const nextValues = {
                  ...values,
                  estimatedRevenue: sanitizeCurrencyInput(e.target.value),
                };
                update({ business: nextValues });
              }}
              onBlur={() => {
                if (!values.estimatedRevenue) return;
                const nextValues = {
                  ...values,
                  estimatedRevenue: formatCurrencyValue(
                    values.estimatedRevenue,
                    countryCode
                  ),
                };
                update({ business: nextValues });
                handleAutoAdvance("estimatedRevenue", nextValues);
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  const nextValues = {
                    ...values,
                    estimatedRevenue: formatCurrencyValue(
                      values.estimatedRevenue || "",
                      countryCode
                    ),
                  };
                  update({ business: nextValues });
                  handleAutoAdvance("estimatedRevenue", nextValues);
                }
              }}
              placeholder={countryCode === "CA" ? "CA$" : "$"}
            />
          </div>
        </div>
      </Card>

      <div style={{ ...layout.stickyCta, marginTop: tokens.spacing.lg }}>
        <Button
          style={{ width: "100%", maxWidth: "220px" }}
          onClick={next}
          disabled={!isValid}
        >
          Continue
        </Button>
      </div>
      </div>
    </WizardLayout>
    </div>
    </div>
  );
}

export default Step3_Business;
