// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
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
import { MonthYearSelect } from "./MonthYearSelect";
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
import { isAccordLOCApp } from "./accordRisk";

// BF_CLIENT_v66_STEP4_CAPITALIZE — title-case helper (Unicode-aware
// for the basic Latin alphabet; preserves embedded punctuation like
// hyphens and apostrophes).
function toTitleCaseV66(input: string): string {
  if (!input) return input;
  return input
    .toLowerCase()
    .replace(/(^|[\s\-'])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}


// BF_CLIENT_BLOCK_v710_ACCORD_STEP4_v1 — per-owner Accord LOC fields (applicant + partner). All optional.
// BF_CLIENT_BLOCK_v720_STEP4_REORDER_v1 — unified per-owner fields in the exact
// requested order (applicant + partner). Base fields always render; the Accord
// LOC extras render only when isAccordLOC. All fields formatted. No Work Phone,
// no CEM here (CEM consent lives in Step 6 with the T&C).
function OwnerFields({ data, setField, setMany, deriveFullName, isAccordLOC, countryCode, regionCountry, regionLabel, postalLabel, identityLabel }) {
  const L = components.form.label;
  const grid = { display: "grid", gridTemplateColumns: typeof window !== "undefined" && window.innerWidth < 600 ? "1fr" : "1fr 1fr", gap: tokens.spacing.md };
  const fmtMoney = (v) => { const n = String(v ?? "").replace(/[^\d]/g, ""); return n ? Number(n).toLocaleString("en-CA") : ""; };
  const yn = (key) => (
    <select value={data[key] || ""} onChange={(e) => setField(key, e.target.value)}>
      <option value="">—</option><option value="Yes">Yes</option><option value="No">No</option>
    </select>
  );
  const setName = (field, v) => {
    if (deriveFullName) {
      const fn = field === "firstName" ? v : (data.firstName || "");
      const ln = field === "lastName" ? v : (data.lastName || "");
      setMany({ [field]: v, fullName: `${fn} ${ln}`.trim() });
    } else setField(field, v);
  };
  return (
    <div style={grid}>
      <div><label style={L}>First Name</label><Input autoComplete="given-name" value={data.firstName || ""} onChange={(e) => setName("firstName", e.target.value)} /></div>
      <div><label style={L}>Last Name</label><Input autoComplete="family-name" value={data.lastName || ""} onChange={(e) => setName("lastName", e.target.value)} /></div>
      <div><label style={L}>Email</label><Input type="email" autoComplete="email" value={data.email || ""} onChange={(e) => setField("email", e.target.value)} /></div>
      <div><label style={L}>Mobile Phone</label><PhoneInput value={formatPhoneNumber(data.phone || "", countryCode)} onChange={(e) => setField("phone", formatPhoneNumber(e.target.value, countryCode))} /></div>
      {isAccordLOC && (
        <div><label style={L}>Home Phone</label><PhoneInput value={formatPhoneNumber(data.homePhone || "", countryCode)} onChange={(e) => setField("homePhone", formatPhoneNumber(e.target.value, countryCode))} /></div>
      )}
      <div><label style={L}>Date of Birth</label><Input type="date" autoComplete="bday" value={data.dob || ""} onChange={(e) => setField("dob", e.target.value)} /></div>
      <div><label style={L}>{identityLabel}</label><Input inputMode="numeric" autoComplete="off" value={formatIdentityNumber(data.ssn || "", countryCode)} onChange={(e) => setField("ssn", formatIdentityNumber(e.target.value, countryCode))} /></div>
      {/* BF_CLIENT_BLOCK_v_ACCORD_FIELDS_v1 — Title/Role (Accord senior leadership). Shared component → applicant + partner. */}
      {isAccordLOC && (
        <div><label style={L}>Title / Role</label>
          <select value={data.title || ""} onChange={(e) => setField("title", e.target.value)}>
            <option value="">—</option><option value="Owner/Operator">Owner/Operator</option><option value="Partner">Partner</option><option value="President">President</option><option value="Director">Director</option><option value="Officer">Officer</option><option value="CEO">CEO</option><option value="CFO">CFO</option><option value="Secretary">Secretary</option><option value="Treasurer">Treasurer</option><option value="Other">Other</option>
          </select>
        </div>
      )}
      {/* BF_CLIENT_UI_CLUSTER_2 — single column so Street pairs with City (true 2-col). */}
      <div><label style={L}>Street Address</label>
        <AddressAutocompleteInput country={regionCountry} value={data.street || ""}
          onChange={(e) => setField("street", e.target.value)}
          onSelect={(sel) => { if (!("street" in sel)) return; setMany({ street: sel.street || data.street, city: sel.city || data.city, state: sel.state || data.state, zip: formatPostalCode(sel.postalCode || data.zip || "", countryCode) }); }} />
      </div>
      <div><label style={L}>City</label><Input autoComplete="address-level2" value={data.city || ""} onChange={(e) => setField("city", e.target.value)} /></div>
      <div><label style={L}>{regionLabel}</label><RegionSelect country={regionCountry} value={data.state || ""} onChange={(v) => setField("state", v)} /></div>
      <div><label style={L}>{postalLabel}</label><Input autoComplete="postal-code" value={formatPostalCode(data.zip || "", countryCode)} onChange={(e) => setField("zip", formatPostalCode(e.target.value, countryCode))} /></div>
      {isAccordLOC && (
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ ...L, display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={data.mailingSameAsPhysical !== false} onChange={(e) => setField("mailingSameAsPhysical", e.target.checked)} />
            Mailing address same as physical
          </label>
        </div>
      )}
      {isAccordLOC && data.mailingSameAsPhysical === false && (
        <>
          <div style={{ gridColumn: "1 / -1" }}><label style={L}>Mailing Address</label><Input value={data.mailingStreet || ""} onChange={(e) => setField("mailingStreet", e.target.value)} /></div>
          <div><label style={L}>Mailing City</label><Input value={data.mailingCity || ""} onChange={(e) => setField("mailingCity", e.target.value)} /></div>
          <div><label style={L}>Mailing {regionLabel}</label><Input value={data.mailingState || ""} onChange={(e) => setField("mailingState", e.target.value)} /></div>
          <div><label style={L}>Mailing {postalLabel}</label><Input value={data.mailingZip || ""} onChange={(e) => setField("mailingZip", e.target.value)} /></div>
        </>
      )}
      {isAccordLOC && (
        <div><label style={L}>At this address since</label><MonthYearSelect ariaLabel="At this address since" value={data.addressSince || ""} onChange={(v) => setField("addressSince", v)} /></div>
      )}
      {isAccordLOC && (
        <div><label style={L}>Own or Rent</label>
          <select value={data.ownRent || ""} onChange={(e) => setField("ownRent", e.target.value)}>
            <option value="">—</option><option value="Own">Own</option><option value="Rent">Rent</option>
          </select>
        </div>
      )}
      {isAccordLOC && data.ownRent === "Own" && (
        <>
          <div><label style={L}>Property Value</label><Input value={data.propertyValue || ""} onChange={(e) => setField("propertyValue", fmtMoney(e.target.value))} placeholder="$" /></div>
          <div><label style={L}>Mortgage Value</label><Input value={data.mortgageBalance || ""} onChange={(e) => setField("mortgageBalance", fmtMoney(e.target.value))} placeholder="$" /></div>
        </>
      )}
      <div><label style={L}>Credit Score Range <span style={{ color: tokens.colors.textSecondary, fontWeight: 400 }}>(optional)</span></label>
        <select value={data.creditScoreRange || ""} onChange={(e) => setField("creditScoreRange", e.target.value)}>
          <option value="">Prefer not to say</option>
          {CREDIT_SCORE_BANDS.map((b) => (<option key={b.label} value={b.label}>{b.label}</option>))}
        </select>
      </div>
      {isAccordLOC && (
        <>
          <div><label style={L}>Director?</label>{yn("director")}</div>
          <div><label style={L}>Officer?</label>{yn("officer")}</div>
          <div><label style={L}>Ever filed bankruptcy / proposal?</label>{yn("bankruptcyFiled")}</div>
          {data.bankruptcyFiled === "Yes" && (
            <div><label style={L}>If yes, when?</label><Input value={data.bankruptcyWhen || ""} onChange={(e) => setField("bankruptcyWhen", e.target.value)} placeholder="Month / Year" /></div>
          )}
        </>
      )}
      <div><label style={L}>Ownership %</label><Input type="number" min="1" max="100" value={data.ownership || ""} onChange={(e) => setField("ownership", e.target.value)} placeholder="%" /></div>
    </div>
  );
}

// BF_CLIENT_BLOCK_v720_STEP4_REORDER_v1 — additional shareholders (3rd+).
function AccordAdditionalShareholders({ list, onChange }) {
  const L = components.form.label;
  const rows = Array.isArray(list) ? list : [];
  const setRow = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const add = () => onChange([...rows, { name: "", address: "", office: "", mobile: "", email: "", ownership: "", director: "", officer: "" }]);
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.md }}>
      {rows.map((r, i) => (
        <div key={i} style={{ border: `1px solid ${tokens.colors.border}`, borderRadius: 8, padding: tokens.spacing.md, display: "grid", gridTemplateColumns: typeof window !== "undefined" && window.innerWidth < 600 ? "1fr" : "1fr 1fr", gap: tokens.spacing.sm }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={L}>Name</label><Input value={r.name || ""} onChange={(e) => setRow(i, "name", e.target.value)} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={L}>Home Address</label><Input value={r.address || ""} onChange={(e) => setRow(i, "address", e.target.value)} /></div>
          <div><label style={L}>Office #</label><Input value={r.office || ""} onChange={(e) => setRow(i, "office", e.target.value)} /></div>
          <div><label style={L}>Mobile #</label><Input value={r.mobile || ""} onChange={(e) => setRow(i, "mobile", e.target.value)} /></div>
          <div><label style={L}>Email</label><Input value={r.email || ""} onChange={(e) => setRow(i, "email", e.target.value)} /></div>
          <div><label style={L}>Ownership %</label><Input type="number" min="0" max="100" value={r.ownership || ""} onChange={(e) => setRow(i, "ownership", e.target.value)} /></div>
          <div><label style={L}>Director?</label><select value={r.director || ""} onChange={(e) => setRow(i, "director", e.target.value)}><option value="">—</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div><label style={L}>Officer?</label><select value={r.officer || ""} onChange={(e) => setRow(i, "officer", e.target.value)}><option value="">—</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={{ gridColumn: "1 / -1" }}><button type="button" onClick={() => remove(i)} style={{ background: "transparent", border: `1px solid ${tokens.colors.border}`, borderRadius: 6, padding: "6px 12px", color: "#b91c1c", cursor: "pointer", fontSize: 13 }}>Remove</button></div>
        </div>
      ))}
      <button type="button" onClick={add} style={{ background: "transparent", border: `1px dashed ${tokens.colors.border}`, borderRadius: 8, padding: "10px", color: tokens.colors.textPrimary, cursor: "pointer", fontSize: 14 }}>+ Add shareholder</button>
    </div>
  );
}


export function Step4_Applicant() {
  const { app, update, autosaveError } = useApplicationStore();
  const readiness = useReadiness();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);

  const values = { ...app.applicant };
  const partner = values.partner || {};
  const isAccordLOC = isAccordLOCApp(app); // BF_CLIENT_BLOCK_v710_ACCORD_STEP4_v1
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

  // BF_CLIENT_BLOCK_v_STEP_DRAFT_HYDRATE_ONCE_v1 — hydrate the saved draft a
  // SINGLE time. Previously this ran on every `values` change and mergeDraft
  // refilled any empty field from the draft, so clearing a field (e.g.
  // Ownership %) to retype it snapped it back to the stale draft value before
  // the user could type. Mirrors the run-once pattern already used in Step 3.
  const draftMergedRef = useRef(false);
  useEffect(() => {
    if (draftMergedRef.current) return;
    const draft = loadStepData(4);
    if (!draft) return;
    draftMergedRef.current = true;
    const merged = mergeDraft(values, draft);
    const changed = Object.keys(merged).some(
      (key) => merged[key] !== values[key]
    );
    if (changed) {
      update({ applicant: merged });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    try {
      enforceV1StepSchema("step4", values);
    } catch (zodErr: any) {
      // BF_CLIENT_BLOCK_1_16_SUBMIT_AND_SCHEMA_ERRORS — surface schema
      // failures so the user sees what to fix instead of silently stuck.
      // eslint-disable-next-line no-console
      console.error("[wizard] Step 4 schema validation failed", { values, zodErr });
      const issue = zodErr?.issues?.[0];
      const field = Array.isArray(issue?.path) ? String(issue.path[0] ?? "") : "";
      const msg = field
        ? `Please review the ${field} field — ${issue?.message ?? "invalid value"}.`
        : "Please review the applicant details — one or more fields are invalid.";
      setSaveError(msg);
      return;
    }
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
    if (!Validate.phone(values.phone)) {
      setSaveError("Please enter a valid 10-digit mobile phone number.");
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
      if (!Validate.phone(partner.phone)) {
        setSaveError("Please enter a valid 10-digit phone number for the partner.");
        return;
      }
      // v_PNW_FORM: each owner needs their own login identity. Partner cannot
      // reuse the applicant's email or phone (the CMP resolves users by these).
      const last10 = (v: string) => (v || "").replace(/[^0-9]/g, "").slice(-10);
      const sameEmail = !!partner.email && !!values.email &&
        partner.email.trim().toLowerCase() === values.email.trim().toLowerCase();
      const samePhone = last10(partner.phone).length === 10 &&
        last10(partner.phone) === last10(values.phone);
      if (sameEmail || samePhone) {
        setSaveError("Each owner must use their own email and phone number — the partner cannot reuse the applicant's contact details.");
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

  // BF_CLIENT_BLOCK_v_WIZARD_DIRECTION_A_FINISH_v1 — removed duplicate shell/heading.
  return (
    <>
      <style>{`.wizard-step-shell label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px}.wizard-step-shell input,.wizard-step-shell select{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;box-sizing:border-box}.wizard-step-shell select{appearance:none;cursor:pointer}`}</style>
        <WizardLayout>
          <div className="wizard-step-shell">
            <StepHeader step={4} title="Applicant Information" subtitle="List everyone with 25%+ ownership. Each partner signs their own copy." />
            {saveError && (
              <Card variant="muted" data-error={true}>
                <div style={components.form.errorText}>{saveError}</div>
              </Card>
            )}
            {autosaveError && (
              <Card variant="muted" style={{ background: "rgba(245, 158, 11, 0.12)", color: tokens.colors.textPrimary }}>
                {autosaveError}
              </Card>
            )}

            <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }} onBlurCapture={() => saveStepData(4, values)}>
              <div style={components.form.eyebrow}>Primary applicant</div>
              <OwnerFields
                data={values}
                setField={setField}
                setMany={(o) => update({ applicant: { ...values, ...o } })}
                deriveFullName
                isAccordLOC={isAccordLOC}
                countryCode={countryCode}
                regionCountry={regionCountry}
                regionLabel={regionLabel}
                postalLabel={postalLabel}
                identityLabel={identityLabel}
              />
              {Number(values.ownership || 0) < 100 && (
                <label style={{ display: "flex", alignItems: "center", gap: tokens.spacing.xs, fontSize: tokens.typography.label.fontSize, fontWeight: tokens.typography.label.fontWeight, color: tokens.colors.textPrimary }}>
                  <Checkbox checked={values.hasMultipleOwners || false} onChange={(e) => setField("hasMultipleOwners", (e.target as HTMLInputElement).checked)} />
                  This business has multiple owners/partners
                </label>
              )}
            </Card>

            {values.hasMultipleOwners && (
              <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg, marginTop: tokens.spacing.lg }} onBlurCapture={() => saveStepData(4, values)}>
                <div style={components.form.eyebrow}>Partner / second owner</div>
                <OwnerFields
                  data={partner}
                  setField={setPartnerField}
                  setMany={(o) => update({ applicant: { ...values, partner: { ...partner, ...o } } })}
                  isAccordLOC={isAccordLOC}
                  countryCode={countryCode}
                  regionCountry={regionCountry}
                  regionLabel={regionLabel}
                  postalLabel={postalLabel}
                  identityLabel={identityLabel}
                />
              </Card>
            )}

            {values.hasMultipleOwners && (
              <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.md, marginTop: tokens.spacing.lg }}>
                <div style={components.form.eyebrow}>Additional shareholders (optional)</div>
                <AccordAdditionalShareholders list={values.additionalShareholders || []} onChange={(next) => setField("additionalShareholders", next)} />
              </Card>
            )}

            <div style={{ ...layout.stickyCta, marginTop: tokens.spacing.lg }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: tokens.spacing.sm }}>
                <Button variant="secondary" style={{ width: "100%", maxWidth: "160px" }} onClick={() => navigate("/apply/step-3")}>← Back</Button>
                <Button style={{ width: "100%", maxWidth: "260px" }} onClick={next} disabled={!isValid}>Continue to Documents →</Button>
              </div>
            </div>
          </div>
        </WizardLayout>
    </>
  );
}

export default Step4_Applicant;
