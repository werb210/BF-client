// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApplicationStore } from "../state/useApplicationStore";
import { ClientAppAPI } from "../api/clientApp";
import { StepHeader } from "../components/StepHeader";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Validate } from "../utils/validate";
import { WizardLayout } from "../components/WizardLayout";
import { RegionSelect } from "../components/RegionSelect";
import {
  formatIdentityNumber,
  formatPhoneNumber,
  formatPostalCode,
  getCountryCode,
  getIdentityLabel,
  getPostalLabel,
  getRegionLabel,
} from "../utils/location";
import { PhoneInput } from "../components/ui/PhoneInput";
import { Checkbox } from "../components/ui/Checkbox";
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
import { useReadiness } from "../state/readinessStore";
import { useAuth } from "@/auth/useAuth";
import { CREDIT_SCORE_BANDS } from "./creditScoreBands";

// BF_CLIENT_v66_STEP4_CAPITALIZE — title-case helper (Unicode-aware
// for the basic Latin alphabet; preserves embedded punctuation like
// hyphens and apostrophes).
function toTitleCaseV66(input: string): string {
  if (!input) return input;
  return input
    .toLowerCase()
    .replace(/(^|[\s\-'])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function Step4_Applicant() {
  const { app, update, autosaveError } = useApplicationStore();
  const readiness = useReadiness();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);

  const values = { ...app.applicant };
  const partner = values.partner || {};
  const countryCode = useMemo(
    () => getCountryCode(app.kyc.businessLocation),
    [app.kyc.businessLocation]
  );
  const identityLabel = getIdentityLabel(countryCode);
  const regionLabel = getRegionLabel(countryCode);
  const postalLabel = getPostalLabel(countryCode);
  const regionCountry = useMemo<"CA" | "US">(
    () => (countryCode === "CA" ? "CA" : "US"),
    [countryCode]
  );

  useEffect(() => {
    if (app.currentStep !== 4) {
      update({ currentStep: 4 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- BF_STEP_RESET_NORACE_v37 (Block 37) — running on every currentStep change caused unmounting step to reset back, fighting next step’s mount effect

  // BF_CLIENT_v66_STEP4_NO_PHONE_PREFILL — do not auto-fill the applicant
  // phone with the OTP-login user's phone. The OTP phone identifies the
  // session, not necessarily the applicant; readiness/creditPrefill paths
  // remain free to populate this field with applicant-entered data.
  // (effect intentionally removed)

  useEffect(() => {
    trackEvent("client_step_viewed", { step: 4 });
  }, []);

  // [removed] resolveStepGuard effect (was racing transitions)

  useEffect(() => {
    const draft = loadStepData(4);
    if (!draft) return;
    const merged = mergeDraft(values, draft);
    const changed = Object.keys(merged).some(
      (key) => merged[key] !== values[key]
    );
    if (changed) {
      update({ applicant: merged });
    }
  }, [update, values]);

  useEffect(() => {
    if (!readiness) return;

    const [firstName = "", ...rest] = (readiness.fullName || "").trim().split(" ");
    const lastName = rest.join(" ");
    const nextApplicant = {
      ...values,
      fullName: readiness.fullName || values.fullName,
      firstName: firstName || values.firstName,
      lastName: lastName || values.lastName,
      email: readiness.email || values.email,
      phone: readiness.phone || values.phone,
    };

    const unchanged =
      nextApplicant.fullName === values.fullName &&
      nextApplicant.firstName === values.firstName &&
      nextApplicant.lastName === values.lastName &&
      nextApplicant.email === values.email &&
      nextApplicant.phone === values.phone;

    if (unchanged) return;

    update({ applicant: nextApplicant, readinessLeadId: readiness.leadId });
  }, [readiness, update, values]);


  useEffect(() => {
    const stored = localStorage.getItem("creditPrefill");
    if (!stored) return;

    try {
      const data = JSON.parse(stored) as Record<string, string>;
      const contactName = (data.fullName || data.contactName || "").trim();
      const [prefillFirstName = "", ...prefillRest] = contactName.split(/\s+/);
      const prefillLastName = prefillRest.join(" ");
      const nextApplicant = {
        ...values,
        fullName: values.fullName || contactName,
        firstName: values.firstName || prefillFirstName,
        lastName: values.lastName || prefillLastName,
        email: values.email || data.email || "",
        phone: values.phone || data.phone || "",
      };

      const changed =
        nextApplicant.fullName !== values.fullName ||
        nextApplicant.firstName !== values.firstName ||
        nextApplicant.lastName !== values.lastName ||
        nextApplicant.email !== values.email ||
        nextApplicant.phone !== values.phone;

      if (changed) {
        update({ applicant: nextApplicant });
      }
    } catch {
      // ignore malformed prefill payload
    }
  }, [update, values]);

  function setField(key: string, value: unknown) {
    update({ applicant: { ...values, [key]: value } });
  }

  function setPartnerField(key: string, value: unknown) {
    update({ applicant: { ...values, partner: { ...partner, [key]: value } } });
  }

  async function next() {
    saveStepData(4, values);
    enforceV1StepSchema("step4", values);
    const requiredFields = [
      // BF_CLIENT_WIZARD_STEP4_FULLNAME_v59 — fullName removed; first
      // and last cover the same intent, and fullName is still
      // auto-derived from them in the input onChange handlers.
      "firstName",
      "lastName",
      "email",
      "phone",
      "street",
      "city",
      "state",
      "zip",
      "dob",
      "ssn",
      "ownership",
    ];

    const missing = requiredFields.find(
      (field) => !Validate.required(values[field])
    );
    if (missing) {
      setSaveError("Please complete all required applicant details.");
      return;
    }

    if (values.hasMultipleOwners) {
      const partnerMissing = partnerRequiredFields.find(
        (field) => !Validate.required(partner[field])
      );
      if (partnerMissing) {
        setSaveError("Please complete all required partner details.");
        return;
      }
    }

    const { ownershipValid } = getOwnershipValidity(values);
    if (!ownershipValid) {
      setSaveError("Ownership percentages must total 100.");
      return;
    }

    setSaveError(null);
    void persistApplicationStep(app, 4, { applicant: values }).catch(() => {});
    const submissionPayload = {
      financialProfile: app.kyc,
      business: app.business,
      applicant: values,
      product_category: app.productCategory,
      selected_product: app.selectedProduct,
      selected_product_type: app.selectedProductType,
      readiness_lead_id: app.readinessLeadId,
      session_token: app.readinessSessionToken || app.continuationToken,
      source: "credit_readiness_bridge",
    };
    if (app.applicationToken) {
      ClientAppAPI.update(app.applicationToken, submissionPayload).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[wizard] Step 4 server PATCH failed", err);
      });
    } else {
      ClientAppAPI.start(submissionPayload).then((res) => {
        const applicationId =
          (res as any)?.applicationId ||
          (res as any)?.data?.applicationId ||
          (res as any)?.data?.token ||
          (res as any)?.token ||
          null;
        if (applicationId) {
          update({ applicationToken: applicationId, applicationId: applicationId });
          try { localStorage.setItem("bf_application_token", String(applicationId)); } catch {}
        }
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[wizard] Step 4 server START failed", err);
      });
    }
    track("step_completed", { step: 4 });
    update({ currentStep: 5 });
    navigate("/apply/step-5");
    // BF_CLIENT_WIZARD_LOCAL_FIRST_v58_STEP4_ANCHOR
  }

  const baseRequiredFields = [
    // BF_CLIENT_WIZARD_STEP4_FULLNAME_v59 — see next() for rationale.
    "firstName",
    "lastName",
    "email",
    "phone",
    "street",
    "city",
    "state",
    "zip",
    "dob",
    "ssn",
    "ownership",
  ];

  const partnerRequiredFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "street",
    "city",
    "state",
    "zip",
    "dob",
    "ssn",
    "ownership",
  ];

  const getOwnershipValidity = (nextValues: typeof values) => {
    const nextPartner = nextValues.partner || {};
    const primaryOwnership = Number(nextValues.ownership || 0);
    const partnerOwnership = Number(nextPartner.ownership || 0);
    const ownershipRangeValid =
      primaryOwnership >= 1 &&
      primaryOwnership <= 100 &&
      (!nextValues.hasMultipleOwners ||
        (partnerOwnership >= 1 && partnerOwnership <= 100));
    const ownershipTotalValid = nextValues.hasMultipleOwners
      ? primaryOwnership + partnerOwnership === 100
      : primaryOwnership === 100;
    return {
      ownershipRangeValid,
      ownershipTotalValid,
      ownershipValid: ownershipRangeValid && ownershipTotalValid,
    };
  };


  const isStepValid = (nextValues: typeof values) => {
    const { ownershipValid } = getOwnershipValidity(nextValues);
    return (
      baseRequiredFields.every((field) =>
        Validate.required(nextValues[field])
      ) &&
      (!nextValues.hasMultipleOwners ||
        partnerRequiredFields.every((field) =>
          Validate.required((nextValues.partner || {})[field])
        )) &&
      ownershipValid
    );
  };

  const isValid = isStepValid(values);

  const buildValueMap = (nextValues: typeof values) => {
    const nextPartner = nextValues.partner || {};
    return {
      firstName: nextValues.firstName,
      lastName: nextValues.lastName,
      email: nextValues.email,
      phone: nextValues.phone,
      street: nextValues.street,
      city: nextValues.city,
      state: nextValues.state,
      zip: nextValues.zip,
      dob: nextValues.dob,
      ssn: nextValues.ssn,
      ownership: nextValues.ownership,
      hasMultipleOwners: nextValues.hasMultipleOwners,
      "partner.firstName": nextPartner.firstName,
      "partner.lastName": nextPartner.lastName,
      "partner.email": nextPartner.email,
      "partner.phone": nextPartner.phone,
      "partner.street": nextPartner.street,
      "partner.city": nextPartner.city,
      "partner.state": nextPartner.state,
      "partner.zip": nextPartner.zip,
      "partner.dob": nextPartner.dob,
      "partner.ssn": nextPartner.ssn,
      "partner.ownership": nextPartner.ownership,
    };
  };

  const focusField = (fieldKey: string) => {
    const id = getWizardFieldId("step4", fieldKey);
    const element = document.getElementById(id) as HTMLElement | null;
    element?.focus();
  };

  const handleAutoAdvance = (
    currentKey: string,
    nextValues: typeof values,
    preferEmpty = false
  ) => {
    const context = { applicant: nextValues };
    const valueMap = buildValueMap(nextValues);
    const nextKey = preferEmpty
      ? getNextEmptyFieldKey("step4", currentKey, context, valueMap)
      : getNextFieldKey("step4", currentKey, context);
    if (nextKey) {
      requestAnimationFrame(() => focusField(nextKey));
      return;
    }
    if (isStepValid(nextValues)) {
      void next();
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "0 0 48px" }}>
      <div style={{ height: 4, background: "#e5e7eb", width: "100%" }}>
        <div style={{ height: 4, background: "#2563eb", width: `${(4 / 6) * 100}%`, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 0" }}>
        <h1 style={{ color: "#2563eb", fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Step 4: Applicant Information</h1>
        <p style={{ color: "#6b7280", textAlign: "center", marginBottom: 32, fontSize: 15 }}>Enter applicant and ownership information.</p>
        <style>{`.wizard-step-shell label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px}.wizard-step-shell input,.wizard-step-shell select{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;box-sizing:border-box}.wizard-step-shell select{appearance:none;cursor:pointer}`}</style>
    <WizardLayout>
      <div className="wizard-step-shell">
      <StepHeader step={4} title="Applicant Information" />
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

      <Card
        style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}
        onBlurCapture={() => saveStepData(4, values)}
      >
        <div style={components.form.eyebrow}>Primary applicant</div>

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
          {/* BF_CLIENT_WIZARD_STEP4_FULLNAME_v59 — removed redundant
            Full Name field. fullName is auto-derived from First Name
            and Last Name onChange handlers below, and submission code
            that depends on applicant.fullName still receives it. */}

          <div>
            <label style={components.form.label}>First Name</label>
            <Input
              id={getWizardFieldId("step4", "firstName")}
              value={values.firstName || ""}
              onChange={(e: unknown) => {
                const firstName = e.target.value;
                const nextValues = {
                  ...values,
                  firstName,
                  fullName: `${firstName} ${values.lastName || ""}`.trim(),
                };
                update({ applicant: nextValues });
              }}
              onBlur={() => {
                // BF_CLIENT_v66_STEP4_CAPITALIZE
                const cased = toTitleCaseV66(values.firstName || "");
                if (cased !== (values.firstName || "")) {
                  const nextValues = {
                    ...values,
                    firstName: cased,
                    fullName: `${cased} ${values.lastName || ""}`.trim(),
                  };
                  update({ applicant: nextValues });
                }
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("firstName", values);
                }
              }}
            />
          </div>
          <div>
            <label style={components.form.label}>Last Name</label>
            <Input
              id={getWizardFieldId("step4", "lastName")}
              value={values.lastName || ""}
              onChange={(e: unknown) => {
                const lastName = e.target.value;
                const nextValues = {
                  ...values,
                  lastName,
                  fullName: `${values.firstName || ""} ${lastName}`.trim(),
                };
                update({ applicant: nextValues });
              }}
              onBlur={() => {
                // BF_CLIENT_v66_STEP4_CAPITALIZE
                const cased = toTitleCaseV66(values.lastName || "");
                if (cased !== (values.lastName || "")) {
                  const nextValues = {
                    ...values,
                    lastName: cased,
                    fullName: `${values.firstName || ""} ${cased}`.trim(),
                  };
                  update({ applicant: nextValues });
                }
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("lastName", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>Email</label>
            <Input
              type="email"
              id={getWizardFieldId("step4", "email")}
              value={values.email || ""}
              onChange={(e: unknown) => {
                const nextValues = { ...values, email: e.target.value };
                update({ applicant: nextValues });
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("email", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>Phone</label>
            <PhoneInput
              id={getWizardFieldId("step4", "phone")}
              value={formatPhoneNumber(values.phone || "", countryCode)}
              onChange={(e: unknown) => {
                const nextValues = {
                  ...values,
                  phone: formatPhoneNumber(e.target.value, countryCode),
                };
                update({ applicant: nextValues });
              }}
              onBlur={() => handleAutoAdvance("phone", values)}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("phone", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>Street Address</label>
            <AddressAutocompleteInput
              id={getWizardFieldId("step4", "street")}
              country={regionCountry}
              value={values.street || ""}
              onChange={(e: unknown) => setField("street", e.target.value)}
              onSelect={(selection) => {
                if (!("street" in selection)) return;
                const nextValues = {
                  ...values,
                  street: selection.street || values.street,
                  city: selection.city || values.city,
                  state: selection.state || values.state,
                  zip: formatPostalCode(
                    selection.postalCode || values.zip || "",
                    countryCode
                  ),
                };
                update({ applicant: nextValues });
                if (shouldAutoAdvance("street", nextValues.street)) {
                  handleAutoAdvance("street", nextValues, true);
                }
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("street", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>City</label>
            <Input
              id={getWizardFieldId("step4", "city")}
              value={values.city || ""}
              onChange={(e: unknown) => {
                const nextValues = { ...values, city: e.target.value };
                update({ applicant: nextValues });
              }}
              onBlur={() => {
                // BF_CLIENT_v66_STEP4_CAPITALIZE
                const cased = toTitleCaseV66(values.city || "");
                if (cased !== (values.city || "")) {
                  update({ applicant: { ...values, city: cased } });
                }
              }}
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
              id={getWizardFieldId("step4", "state")}
              onChange={(value) => {
                const nextValues = { ...values, state: value };
                update({ applicant: nextValues });
                handleAutoAdvance("state", nextValues);
              }}
            />
          </div>
          <div>
            <label style={components.form.label}>{postalLabel}</label>
            <Input
              id={getWizardFieldId("step4", "zip")}
              value={formatPostalCode(values.zip || "", countryCode)}
              onChange={(e: unknown) => {
                const nextValues = {
                  ...values,
                  zip: formatPostalCode(e.target.value, countryCode),
                };
                update({ applicant: nextValues });
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("zip", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>Date of Birth</label>
            <Input
              type="date"
              id={getWizardFieldId("step4", "dob")}
              value={values.dob || ""}
              onChange={(e: unknown) => {
                const nextValues = { ...values, dob: e.target.value };
                update({ applicant: nextValues });
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("dob", values);
                }
              }}
            />
          </div>
          <div>
            <label style={components.form.label}>{identityLabel}</label>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              id={getWizardFieldId("step4", "ssn")}
              value={formatIdentityNumber(values.ssn || "", countryCode)}
              onChange={(e: unknown) => {
                const nextValues = {
                  ...values,
                  ssn: formatIdentityNumber(e.target.value, countryCode),
                };
                update({ applicant: nextValues });
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("ssn", values);
                }
              }}
            />
          </div>

          <div>
            <label style={components.form.label}>Ownership %</label>
            <Input
              id={getWizardFieldId("step4", "ownership")}
              type="number"
              min="1"
              max="100"
              value={values.ownership || ""}
              onChange={(e: unknown) => {
                const nextValues = { ...values, ownership: e.target.value };
                update({ applicant: nextValues });
              }}
              onKeyDown={(e: unknown) => {
                if (e.key === "Enter") {
                  handleAutoAdvance("ownership", values);
                }
              }}
              placeholder="%"
            />
          </div>

          {/* BF_CLIENT_WIZARD_STEP4_CREDITSCORE_v60 — Credit Score
            Range now lives inside the Ownership two-column row so the
            applicant card stays in 2 columns. */}
          <div>
            <label style={components.form.label}>
              Credit Score Range{" "}
              <span style={{ color: tokens.colors.textSecondary, fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <select
              value={(values as any).creditScoreRange || ""}
              onChange={(e) => {
                const next = { ...values, creditScoreRange: e.target.value };
                update({ applicant: next });
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: 8,
                fontSize: 14,
                background: tokens.colors.surface,
                color: tokens.colors.textPrimary,
              }}
            >
              <option value="">Prefer not to say</option>
              {CREDIT_SCORE_BANDS.map((b) => (
                <option key={b.label} value={b.label}>{b.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* BF_CLIENT_WIZARD_STEP4_CREDITSCORE_v60 — old standalone
          full-width Credit Score block was here; removed because the
          field is now part of the Ownership row above. */}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: tokens.spacing.xs,
            fontSize: tokens.typography.label.fontSize,
            fontWeight: tokens.typography.label.fontWeight,
            color: tokens.colors.textPrimary,
          }}
        >
          <Checkbox
            checked={values.hasMultipleOwners || false}
            onChange={(e) =>
              setField("hasMultipleOwners", (e.target as HTMLInputElement).checked)
            }
          />
          This business has multiple owners/partners
        </label>

        {values.hasMultipleOwners && (
          <div
            style={{
              marginTop: tokens.spacing.md,
              paddingTop: tokens.spacing.md,
              borderTop: `1px solid ${tokens.colors.border}`,
            }}
          >
            <div
              style={{
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: tokens.colors.textSecondary,
                marginBottom: tokens.spacing.sm,
              }}
            >
              Partner Information
            </div>
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
                <label style={components.form.label}>Partner First Name</label>
                <Input
                  id={getWizardFieldId("step4", "partner.firstName")}
                  value={partner.firstName || ""}
                  onChange={(e: unknown) =>
                    setPartnerField("firstName", e.target.value)
                  }
                  onKeyDown={(e: unknown) => {
                    if (e.key === "Enter") {
                      handleAutoAdvance("partner.firstName", values);
                    }
                  }}
                />
              </div>
              <div>
                <label style={components.form.label}>Partner Last Name</label>
                <Input
                  id={getWizardFieldId("step4", "partner.lastName")}
                  value={partner.lastName || ""}
                  onChange={(e: unknown) =>
                    setPartnerField("lastName", e.target.value)
                  }
                  onKeyDown={(e: unknown) => {
                    if (e.key === "Enter") {
                      handleAutoAdvance("partner.lastName", values);
                    }
                  }}
                />
              </div>

              <div>
                <label style={components.form.label}>Partner Email</label>
                <Input
                  type="email"
                  id={getWizardFieldId("step4", "partner.email")}
                  value={partner.email || ""}
                  onChange={(e: unknown) =>
                    setPartnerField("email", e.target.value)
                  }
                  onKeyDown={(e: unknown) => {
                    if (e.key === "Enter") {
                      handleAutoAdvance("partner.email", values);
                    }
                  }}
                />
              </div>

              <div>
                <label style={components.form.label}>Partner Phone</label>
                <PhoneInput
                  id={getWizardFieldId("step4", "partner.phone")}
                  value={formatPhoneNumber(partner.phone || "", countryCode)}
                  onChange={(e: unknown) =>
                    setPartnerField(
                      "phone",
                      formatPhoneNumber(e.target.value, countryCode)
                    )
                  }
                  onBlur={() => handleAutoAdvance("partner.phone", values)}
                  onKeyDown={(e: unknown) => {
                    if (e.key === "Enter") {
                      handleAutoAdvance("partner.phone", values);
                    }
                  }}
                />
              </div>

              <div>
                <label style={components.form.label}>Partner Address</label>
                <AddressAutocompleteInput
                  id={getWizardFieldId("step4", "partner.street")}
                  country={regionCountry}
                  value={partner.street || ""}
                  onChange={(e: unknown) =>
                    setPartnerField("street", e.target.value)
                  }
                  onSelect={(selection) => {
                    if (!("street" in selection)) return;
                    const nextValues = {
                      ...values,
                      partner: {
                        ...partner,
                        street: selection.street || partner.street,
                        city: selection.city || partner.city,
                        state: selection.state || partner.state,
                        zip: formatPostalCode(
                          selection.postalCode || partner.zip || "",
                          countryCode
                        ),
                      },
                    };
                    update({ applicant: nextValues });
                    if (shouldAutoAdvance("street", nextValues.partner?.street)) {
                      handleAutoAdvance("partner.street", nextValues, true);
                    }
                  }}
                  onKeyDown={(e: unknown) => {
                    if (e.key === "Enter") {
                      handleAutoAdvance("partner.street", values);
                    }
                  }}
                />
              </div>

              <div>
                <label style={components.form.label}>Partner City</label>
                <Input
                  id={getWizardFieldId("step4", "partner.city")}
                  value={partner.city || ""}
                  onChange={(e: unknown) =>
                    setPartnerField("city", e.target.value)
                  }
                  onKeyDown={(e: unknown) => {
                    if (e.key === "Enter") {
                      handleAutoAdvance("partner.city", values);
                    }
                  }}
                />
              </div>
              <div>
                <label style={components.form.label}>Partner {regionLabel}</label>
                <RegionSelect
                  country={regionCountry}
                  value={partner.state || ""}
                  id={getWizardFieldId("step4", "partner.state")}
                  onChange={(value) => {
                    const nextValues = {
                      ...values,
                      partner: { ...partner, state: value },
                    };
                    update({ applicant: nextValues });
                    handleAutoAdvance("partner.state", nextValues);
                  }}
                />
              </div>
              <div>
                <label style={components.form.label}>Partner {postalLabel}</label>
                <Input
                  id={getWizardFieldId("step4", "partner.zip")}
                  value={formatPostalCode(partner.zip || "", countryCode)}
                  onChange={(e: unknown) =>
                    setPartnerField(
                      "zip",
                      formatPostalCode(e.target.value, countryCode)
                    )
                  }
                  onKeyDown={(e: unknown) => {
                    if (e.key === "Enter") {
                      handleAutoAdvance("partner.zip", values);
                    }
                  }}
                />
              </div>

              <div>
                <label style={components.form.label}>Partner DOB</label>
                <Input
                  type="date"
                  id={getWizardFieldId("step4", "partner.dob")}
                  value={partner.dob || ""}
                  onChange={(e: unknown) =>
                    setPartnerField("dob", e.target.value)
                  }
                  onKeyDown={(e: unknown) => {
                    if (e.key === "Enter") {
                      handleAutoAdvance("partner.dob", values);
                    }
                  }}
                />
              </div>
              <div>
                <label style={components.form.label}>Partner {identityLabel}</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  id={getWizardFieldId("step4", "partner.ssn")}
                  value={formatIdentityNumber(partner.ssn || "", countryCode)}
                  onChange={(e: unknown) =>
                    setPartnerField(
                      "ssn",
                      formatIdentityNumber(e.target.value, countryCode)
                    )
                  }
                  onKeyDown={(e: unknown) => {
                    if (e.key === "Enter") {
                      handleAutoAdvance("partner.ssn", values);
                    }
                  }}
                />
              </div>

              <div>
                <label style={components.form.label}>Partner Ownership %</label>
                <Input
                  id={getWizardFieldId("step4", "partner.ownership")}
                  type="number"
                  min="1"
                  max="100"
                  value={partner.ownership || ""}
                  onChange={(e: unknown) =>
                    setPartnerField("ownership", e.target.value)
                  }
                  onKeyDown={(e: unknown) => {
                    if (e.key === "Enter") {
                      handleAutoAdvance("partner.ownership", values);
                    }
                  }}
                  placeholder="%"
                />
              </div>

              {/* BF_CLIENT_WIZARD_STEP4_CREDITSCORE_v60 — partner
                credit score band, beside Partner Ownership %. */}
              <div>
                <label style={components.form.label}>
                  Partner Credit Score Range{" "}
                  <span style={{ color: tokens.colors.textSecondary, fontWeight: 400 }}>
                    (optional)
                  </span>
                </label>
                <select
                  value={(partner as any).creditScoreRange || ""}
                  onChange={(e) =>
                    setPartnerField("creditScoreRange", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: `1px solid ${tokens.colors.border}`,
                    borderRadius: 8,
                    fontSize: 14,
                    background: tokens.colors.surface,
                    color: tokens.colors.textPrimary,
                  }}
                >
                  <option value="">Prefer not to say</option>
                  {CREDIT_SCORE_BANDS.map((b) => (
                    <option key={b.label} value={b.label}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div style={{ ...layout.stickyCta, marginTop: tokens.spacing.lg }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: tokens.spacing.sm }}>
          <Button
            variant="secondary"
            style={{ width: "100%", maxWidth: "160px" }}
            onClick={() => navigate("/apply/step-3")}
          >
            ← Back
          </Button>
          <Button
            style={{ width: "100%", maxWidth: "260px" }}
            onClick={next}
            disabled={!isValid}
          >
            Continue to Documents →
          </Button>
        </div>
      </div>
      </div>
    </WizardLayout>
    </div>
    </div>
  );
}

export default Step4_Applicant;
