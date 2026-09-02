// @ts-nocheck
if (typeof console !== "undefined") console.log("[wizard] Step3_Business module evaluated");
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApplicationStore } from "../state/useApplicationStore";
import { ClientAppAPI } from "../api/clientApp";
import { StepHeader } from "../components/StepHeader";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { RegionSelect } from "../components/RegionSelect";
import { MonthYearSelect } from "./MonthYearSelect";
import { NaicsPicker } from "./NaicsPicker"; // BF_CLIENT_SBA_1919_STEP3_v196
import { Validate } from "../utils/validate";
import {
  formatCurrencyValue,
  formatCurrencyOnInput,
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
// BF_CLIENT_AUTOFILL_STEP3_OTP_v1 - autocomplete tokens on the business
// address so iOS can fill it from the Contact card.
import { AddressAutocompleteInput } from "../components/ui/AddressAutocompleteInput";
import {
  getNextEmptyFieldKey,
  getNextFieldKey,
  getWizardFieldId,
  isSbaWizardPath,
} from "./wizardSchema";
import { enforceV1StepSchema } from "../schemas/v1WizardSchema";
import { shouldAutoAdvance } from "../utils/autoadvance";
import { persistApplicationStep } from "./saveStepProgress";
import { isAccordLOCApp } from "./accordRisk";

export function Step3_Business() {
  const { app, update, autosaveError } = useApplicationStore();
  // BF_CLIENT_SBA_REDUCED_v191 - start-ups have no operating history to report.
  // Step 3 therefore asks only for basic identity and contact details, all optional.
  // BF_CLIENT_SBA_PATH_FROM_PRODUCT_v160
  const onSbaStartupPath = isSbaWizardPath(app as Record<string, unknown>);
  console.log("[wizard] Step3_Business RENDER", { currentStep: app.currentStep, applicationToken: app.applicationToken, businessLocation: app.kyc?.businessLocation });
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);

  // BF_CLIENT_BLOCK_v105_SUBMIT_UNBLOCK_v1 — stabilize `values` ref so
  // merge effects below don't re-fire on every parent render.
  const values = useMemo<Record<string, any>>(
    () => ({ ...((app.business as Record<string, any>) || {}) }),
    [app.business]
  );
  // BF_CLIENT_BLOCK_v105_SUBMIT_UNBLOCK_v1 — gate one-time merges.
  const draftMergedRef = useRef(false);
  const creditPrefillMergedRef = useRef(false);
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

  // BF_CLIENT_BLOCK_v300_ACCORD_LOC_STEP3_v1 — Accord LOC branch.
  // Triggered only for Line of Credit + Canada + funding < $1,000,000
  // (Accord is the sole lender in that band). New fields render and
  // validate only inside this branch; all other products are untouched.
  const isAccordLOC = isAccordLOCApp(app);

  function deriveYearsInBusiness(monthValue: string): number | "" {
    if (!monthValue) return "";
    const [y, m] = monthValue.split("-").map((part) => Number(part));
    if (!y || !m) return "";
    const now = new Date();
    let years = now.getFullYear() - y;
    if (now.getMonth() + 1 < m) years -= 1;
    return years < 0 ? 0 : years;
  }

  function setInBusinessSince(monthValue: string) {
    // One input feeds both: keep the picker value, derive a concrete
    // startDate (first of the month) so downstream consumers and the
    // strict step3 schema stay valid, and compute yearsInBusiness.
    const startDate = monthValue ? `${monthValue}-01` : "";
    update({
      business: {
        ...values,
        inBusinessSince: monthValue,
        startDate,
        yearsInBusiness: deriveYearsInBusiness(monthValue),
      },
    });
  }

  // BF_CLIENT_STEP3_ACCORD_v180 - returns WHAT is missing rather than just
  // whether anything is, so the summary above Continue can name these fields
  // the same way it names the base ten. accordRequirementsMet is kept as a
  // thin wrapper because three call sites use it as a boolean.
  function missingAccordFields(v: Record<string, any>): string[] {
    if (!isAccordLOC) return [];
    const out: string[] = [];
    if (!Validate.required(v.fiscalYearEnd)) out.push("fiscal year end");
    if (!Validate.required(v.inBusinessSince)) out.push("the month and year the business started");
    if (v.mailingSameAsOperating === false) {
      if (!Validate.required(v.mailingAddress)) out.push("mailing address");
      if (!Validate.required(v.mailingCity)) out.push("mailing city");
      if (!Validate.required(v.mailingState)) out.push("mailing province or state");
      if (!Validate.required(v.mailingZip)) out.push("mailing postal or ZIP code");
    }
    return out;
  }

  function accordRequirementsMet(v: Record<string, any>): boolean {
    return missingAccordFields(v).length === 0;
  }

  useEffect(() => {
    console.log("[wizard] Step3_Business MOUNTED effect ran", { currentStep: app.currentStep });
    if (app.currentStep !== 3) {
      update({ currentStep: 3 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- BF_STEP_RESET_NORACE_v37 (Block 37) — running on every currentStep change caused unmounting step to reset back, fighting next step’s mount effect

  useEffect(() => {
    trackEvent("client_step_viewed", { step: 3 });
  }, []);

  // [removed] resolveStepGuard effect — caused step transition races

  useEffect(() => {
    // BF_CLIENT_BLOCK_v105_SUBMIT_UNBLOCK_v1 — run-once draft merge.
    if (draftMergedRef.current) return;
    const draft = loadStepData(3);
    if (!draft) return;
    draftMergedRef.current = true;
    const merged = mergeDraft(values, draft);
    const changed = Object.keys(merged).some(
      (key) => merged[key] !== values[key]
    );
    if (changed) {
      update({ business: merged });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    // BF_CLIENT_BLOCK_v105_SUBMIT_UNBLOCK_v1 — run-once credit prefill merge.
    if (creditPrefillMergedRef.current) return;
    const stored = localStorage.getItem("creditPrefill");
    if (!stored) return;
    creditPrefillMergedRef.current = true;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(key: string, value: unknown) {
    update({ business: { ...values, [key]: value } });
  }

  const isBusinessNameLocked = false;
  const isLegalNameLocked = false;
  const isCompanyNameLocked = false;
  const isBusinessPhoneLocked = false;

  const REQUIRED_STEP3 = [
    // BF_CLIENT_v66_STEP3_LEGAL_OPTIONAL — legalName removed from this
    // list; it's optional on the form and is filled from businessName
    // on continue when blank. companyName is mirrored from businessName
    // on every keystroke, so requiring both is also redundant.
    ["businessName", "business name"],
    ["businessStructure", "business structure"],
    ["address", "business address"],
    ["city", "city"],
    ["state", "province or state"],
    ["zip", "postal or ZIP code"],
    ["phone", "business phone"],
    ["startDate", "business start date"],
    ["employees", "number of employees"],
    ["estimatedRevenue", "estimated yearly revenue"],
  ] as const;

  const missingStep3 = onSbaStartupPath ? [] : [ // BF_CLIENT_SBA_REDUCED_v191
    ...REQUIRED_STEP3
      .filter(([field]) => !Validate.required(values[field]))
      .map(([, label]) => label),
    // BF_CLIENT_STEP3_ACCORD_v180 - the Accord LOC branch adds up to six more.
    ...missingAccordFields(values),
  ];

  const isValid = missingStep3.length === 0;

  async function next() {
    saveStepData(3, values);
    try {
      if (!onSbaStartupPath) enforceV1StepSchema("step3", values);
    } catch (zodErr: any) {
      // BF_CLIENT_BLOCK_1_16_SUBMIT_AND_SCHEMA_ERRORS — surface schema
      // failures so the user sees what to fix instead of silently stuck.
      // eslint-disable-next-line no-console
      console.error("[wizard] Step 3 schema validation failed", { values, zodErr });
      const issue = zodErr?.issues?.[0];
      const field = Array.isArray(issue?.path) ? String(issue.path[0] ?? "") : "";
      const msg = field
        ? `Please review the ${field} field — ${issue?.message ?? "invalid value"}.`
        : "Please review the business details — one or more fields are invalid.";
      setSaveError(msg);
      return;
    }
    // BF_CLIENT_v66_STEP3_LEGAL_OPTIONAL — copy DBA/business name into
    // the legal name when the legal field was left blank, so downstream
    // consumers (CRM mirror, lender submission payloads) still receive
    // a populated legal name without forcing the applicant to re-type it.
    let nextValues = values;
    if (!Validate.required(nextValues.legalName) && Validate.required(nextValues.businessName)) {
      nextValues = { ...nextValues, legalName: nextValues.businessName };
      update({ business: nextValues });
    }
    const requiredFields = [
      // BF_CLIENT_v66_STEP3_LEGAL_OPTIONAL — legalName is no longer required.
      "businessName",
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

    const missing = !onSbaStartupPath && requiredFields.find(
      (field) => !Validate.required(nextValues[field])
    );
    if (missing) {
      setSaveError("Please complete all required business details.");
      return;
    }
    if (!onSbaStartupPath && !Validate.phone(nextValues.phone)) {
      setSaveError("Please enter a valid 10-digit phone number for the business.");
      return;
    }
    // BF_CLIENT_BLOCK_v300_ACCORD_LOC_STEP3_v1
    if (!onSbaStartupPath && !accordRequirementsMet(nextValues)) {
      setSaveError("Please complete all required Accord line-of-credit details.");
      return;
    }

    setSaveError(null);
    void persistApplicationStep(app, 3, { business: nextValues }).catch(() => {});
    if (app.applicationToken) {
      ClientAppAPI.update(app.applicationToken, { business: nextValues }).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[wizard] Step 3 server PATCH failed", err);
      });
    }
    track("step_completed", { step: 3 });
    update({ currentStep: 4 });
    navigate("/apply/step-4");
    // BF_CLIENT_WIZARD_LOCAL_FIRST_v58_STEP3_ANCHOR
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
      // BF_CLIENT_WIZARD_STEP3_COMPANYNAME_v60 — see isValid for rationale.
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
    ].every((field) => Validate.required(nextValues[field])) && accordRequirementsMet(nextValues);

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

  // BF_CLIENT_BLOCK_v_WIZARD_DIRECTION_A_v1 — removed duplicate centered heading + own
  // progress bar + outer full-bleed wrapper; StepHeader is the single chrome. The
  // wizard-step-shell <style> is preserved.
  return (
    <>
      <style>{`.wizard-step-shell label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px}.wizard-step-shell input,.wizard-step-shell select{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;box-sizing:border-box}.wizard-step-shell select{appearance:none;cursor:pointer}`}</style>
    <WizardLayout>
      <div className="wizard-step-shell">
      <StepHeader step={3} title="Business Details" subtitle="Legal information about your company." />
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
      {/* BF_CLIENT_BLOCK_v96_LIVE_TEST_FIXES_v1 — duplicate StepHeader removed.
          The first instance at the top of the WizardLayout still renders. */}

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
          {/* BF_CLIENT_WIZARD_STEP3_COMPANYNAME_v60 — Company Name
            input was removed from the UI. The companyName field is
            kept in state and mirrored from Business Name (DBA) on
            every keystroke so server records stay valid until the
            column itself is dropped (separate cross-repo round). */}

          {/* BF_CLIENT_SBA_1919_STEP3_v196
              SBA Form 1919 asks six things about the business that nothing else in
              the wizard captures. They sit at the top of Step 3 because that is
              where the company is described, and because Q4 can end the application
              outright - better to ask before someone fills in an address than after.

              NAICS, year began and employee count were on the form until v191 hid
              them on the SBA path. That was right for AR balances and revenue
              history; it was wrong for these three, which 1919 asks of every
              applicant regardless. They write back to the same startDate and
              employees keys, so nothing downstream changes.

              Person-level questions (912 Q8-Q10, place of birth, citizenship) are
              deliberately NOT here: they are asked per owner and repeat for every
              20%+ owner, so they belong on Step 4 beside SSN and date of birth. */}
          {onSbaStartupPath && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ ...components.form.eyebrow, marginBottom: tokens.spacing.sm }}>
                SBA loan questions
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    typeof window !== "undefined" && window.innerWidth < 600 ? "1fr" : "1fr 1fr",
                  gap: tokens.spacing.md,
                  marginBottom: tokens.spacing.lg,
                }}
              >
                <div>
                  <label style={components.form.label}>Business EIN</label>
                  <Input
                    inputMode="numeric"
                    placeholder="12-3456789"
                    value={values.ein || ""}
                    onChange={(e: any) => setField("ein", e.target.value)}
                  />
                </div>

                <div>
                  <label style={components.form.label}>Industry (NAICS code)</label>
                  <NaicsPicker
                    value={values.naicsCode || ""}
                    title={values.naicsTitle || ""}
                    country={countryCode}
                    onPick={(code, title) =>
                      update({ business: { ...values, naicsCode: code, naicsTitle: title } })
                    }
                  />
                </div>

                <div>
                  <label style={components.form.label}>Year began operations</label>
                  <Input
                    inputMode="numeric"
                    placeholder="2026"
                    value={values.startDate || ""}
                    onChange={(e: any) => setField("startDate", e.target.value)}
                  />
                </div>

                <div>
                  <label style={components.form.label}>Number of employees (including owners)</label>
                  <Input
                    type="number"
                    min="0"
                    value={values.employees || ""}
                    onChange={(e: any) => setField("employees", e.target.value)}
                  />
                </div>

                {/* 1919 Q4. SBA's own wording: a Yes means the applicant is not
                    eligible for SBA financial assistance. No lender discretion. */}
                <div>
                  <label style={components.form.label}>
                    Is the applicant, or any associate of the applicant, currently
                    incarcerated, serving a sentence, or under indictment for a felony
                    or any crime involving financial misconduct or a false statement?
                  </label>
                  <Select
                    value={values.sbaQ4Criminal || ""}
                    onChange={(e: any) => setField("sbaQ4Criminal", e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </Select>
                  {values.sbaQ4Criminal === "yes" && (
                    <>
                      <div style={{ ...components.form.errorText, marginTop: 6 }}>
                        SBA rules make an applicant in this position ineligible for 7(a)
                        assistance. Carry on if you like and we will look at other options,
                        but we cannot place this as an SBA loan.
                      </div>
                      {/* BF_CLIENT_SBA_YES_DETAIL_v214 - collected here rather than
                          as a nameless upload in the mini-portal days later. */}
                      <div style={{ marginTop: 8 }}>
                        <label style={components.form.label}>Please give the details</label>
                        <textarea
                          value={values.sbaQ4CriminalDetail || ""}
                          onChange={(e: any) => setField("sbaQ4CriminalDetail", e.target.value)}
                          placeholder="Charge or offence, date, jurisdiction, and current status"
                          rows={3}
                          style={{ ...components.form.input, width: "100%", resize: "vertical", fontFamily: "inherit" }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* 1919 applicant certification. */}
                <div>
                  <label style={components.form.label}>
                    Is the business at least 51% owned and controlled by US citizens or
                    Lawful Permanent Residents?
                  </label>
                  <Select
                    value={values.sbaCitizenOwned || ""}
                    onChange={(e: any) => setField("sbaCitizenOwned", e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={components.form.label}>Business Name (DBA)</label>
            <Input
              id={getWizardFieldId("step3", "businessName")}
              autoComplete="organization"
              value={values.businessName || ""}
              onChange={(e: unknown) => {
                const businessName = e.target.value;
                const nextValues = {
                  ...values,
                  businessName,
                  // Mirror into companyName so the server record keeps
                  // a non-null value during the transition.
                  companyName: businessName,
                };
                update({ business: nextValues });
              }}
              disabled={isBusinessNameLocked}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("businessName", values);
                }
              }}
            />
          </div>

          <div>
            {/* BF_CLIENT_v66_STEP3_LEGAL_OPTIONAL — legal name is optional now;
              if blank on continue we copy the DBA/business name into it. */}
            <label style={components.form.label}>Business Legal Name (if applicable)</label>
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
              autoComplete="address-level2"
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
              autoComplete="postal-code"
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

          {/* BF_CLIENT_BLOCK_v300_ACCORD_LOC_STEP3_v1 — Accord mailing address */}
          {isAccordLOC && (
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: tokens.spacing.md }}>
              <label style={{ ...components.form.label, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={values.mailingSameAsOperating !== false}
                  onChange={(e: any) =>
                    update({ business: { ...values, mailingSameAsOperating: e.target.checked } })
                  }
                />
                Mailing address same as operating address
              </label>
              {values.mailingSameAsOperating === false && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      typeof window !== "undefined" && window.innerWidth < 600 ? "1fr" : "1fr 1fr",
                    gap: tokens.spacing.md,
                  }}
                >
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={components.form.label}>Mailing Address</label>
                    <AddressAutocompleteInput
                      country={regionCountry}
                      value={values.mailingAddress || ""}
                      onChange={(e: any) => setField("mailingAddress", e.target.value)}
                      onSelect={(selection: any) => {
                        if (!("street" in selection)) return;
                        update({
                          business: {
                            ...values,
                            mailingAddress: selection.street || values.mailingAddress,
                            mailingCity: selection.city || values.mailingCity,
                            mailingState: selection.state || values.mailingState,
                            mailingZip: formatPostalCode(
                              selection.postalCode || values.mailingZip || "",
                              countryCode
                            ),
                          },
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label style={components.form.label}>City</label>
                    <Input
                      value={values.mailingCity || ""}
                      onChange={(e: any) => setField("mailingCity", e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={components.form.label}>{regionLabel}</label>
                    <RegionSelect
                      country={regionCountry}
                      value={values.mailingState || ""}
                      onChange={(value: string) => setField("mailingState", value)}
                    />
                  </div>
                  <div>
                    <label style={components.form.label}>{postalLabel}</label>
                    <Input
                      value={formatPostalCode(values.mailingZip || "", countryCode)}
                      onChange={(e: any) =>
                        setField("mailingZip", formatPostalCode(e.target.value, countryCode))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
              autoComplete="url"
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

          {/* BF_CLIENT_SBA_REDUCED_v191 - no operating history on the SBA path */}
          {!isAccordLOC && !onSbaStartupPath && (
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
          )}

          {/* BF_CLIENT_BLOCK_v300_ACCORD_LOC_STEP3_v1 — replaces Business Start Date in the Accord branch */}
          {isAccordLOC && (
            <div>
              <label style={components.form.label}>In Business Since</label>
              <MonthYearSelect
                id={getWizardFieldId("step3", "startDate")}
                ariaLabel="In Business Since"
                value={values.inBusinessSince || ""}
                onChange={(v) => setInBusinessSince(v)}
              />
            </div>
          )}
          {isAccordLOC && (
            <div>
              <label style={components.form.label}>Fiscal Year-End</label>
              <MonthYearSelect
                monthOnly
                ariaLabel="Fiscal Year-End"
                value={values.fiscalYearEnd || ""}
                onChange={(v) => setField("fiscalYearEnd", v)}
                yearsBack={5}
                yearsForward={5}
              />
            </div>
          )}
          {/* BF_CLIENT_BLOCK_v710_ACCORD_STEP3_v1 — CRA business number (optional) */}
          {isAccordLOC && (
            <div>
              <label style={components.form.label}>CRA Business Number <span style={{ color: tokens.colors.textSecondary, fontWeight: 400 }}>(optional)</span></label>
              <Input value={values.craBusinessNumber || ""} onChange={(e: any) => setField("craBusinessNumber", e.target.value)} placeholder="e.g. 123456789 RC0001" />
            </div>
          )}
          {/* BF_CLIENT_BLOCK_v710_ACCORD_STEP3_v1 — economic impact (optional) */}
          {isAccordLOC && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={components.form.label}>As a result of this loan, the business expects to <span style={{ color: tokens.colors.textSecondary, fontWeight: 400 }}>(optional)</span></label>
              <div style={{ display: "grid", gridTemplateColumns: typeof window !== "undefined" && window.innerWidth < 600 ? "1fr" : "1fr 1fr 1fr", gap: tokens.spacing.md }}>
                <div><label style={components.form.label}>Rehire laid-off (#)</label><Input type="number" min="0" value={values.econRehire || ""} onChange={(e: any) => setField("econRehire", e.target.value)} /></div>
                <div><label style={components.form.label}>Retain at-risk (#)</label><Input type="number" min="0" value={values.econRetain || ""} onChange={(e: any) => setField("econRetain", e.target.value)} /></div>
                <div><label style={components.form.label}>Hire new (#)</label><Input type="number" min="0" value={values.econHireNew || ""} onChange={(e: any) => setField("econHireNew", e.target.value)} /></div>
              </div>
            </div>
          )}

          {/* BF_CLIENT_SBA_REDUCED_v191 */}
          <div style={{ display: onSbaStartupPath ? "none" : undefined }}>
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

          {/* BF_CLIENT_SBA_REDUCED_v191 */}
          <div style={{ display: onSbaStartupPath ? "none" : undefined }}>
            <label style={components.form.label}>Estimated Yearly Revenue</label>
            <Input
              id={getWizardFieldId("step3", "estimatedRevenue")}
              inputMode="decimal"
              value={values.estimatedRevenue || ""}
              onChange={(e: unknown) => {
                const nextValues = {
                  ...values,
                  estimatedRevenue: formatCurrencyOnInput(e.target.value, countryCode),
                };
                update({ business: nextValues });
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
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
        {missingStep3.length > 0 && (
          <div style={{ width: "100%", color: tokens.colors.textSecondary, fontSize: 14 }}>
            Please complete: {missingStep3.join(", ")}.
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: tokens.spacing.sm }}>
          <Button
            variant="secondary"
            style={{ width: "100%", maxWidth: "160px" }}
            onClick={() => navigate("/apply/step-2")}
          >
            ← Back
          </Button>
          {/* BF_CLIENT_STEP34_GUIDE_v156 - not disabled. Pressing it is how the
              applicant finds out what is missing; a disabled button answers
              nothing and this step has no per-field messages to fall back on. */}
          <Button
            style={{ width: "100%", maxWidth: "220px" }}
            onClick={() => {
              if (!isValid) {
                setSaveError(
                  missingStep3.length === 1
                    ? `One thing left: ${missingStep3[0]}.`
                    : `${missingStep3.length} things left: ${missingStep3.join(", ")}.`,
                );
                return;
              }
              setSaveError(null);
              void next();
            }}
            aria-disabled={!isValid}
          >
            Continue
          </Button>
        </div>
      </div>
      </div>
    </WizardLayout>
    </>
  );
}

export default Step3_Business;
