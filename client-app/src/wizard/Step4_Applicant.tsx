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
import { isStartupPathKyc } from "./wizardSchema"; // BF_CLIENT_SBA_SKIP_DOCS_v192
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
// BF_CLIENT_SBA_912_STEP4_v197 - onSba threads through here rather than being
// duplicated per owner card. SBA Form 912 is filled in by EVERY owner of 20% or
// more, so the questions have to live in the shared component: asking them once
// on the page would collect the primary applicant's answers and silently attach
// them to the partner as well.
// BF_CLIENT_STEP4_ADDRESS_SINCE_v139
// Form 912: "Most recent prior address (omit if over 10 years ago)". Blank means
// unanswered, and an unanswered question must not hide the follow-up - so blank
// returns true and the field stays visible.
export function underTenYearsAtAddress(since: unknown): boolean {
  const raw = String(since ?? "").trim();
  if (!raw) return true;
  const m = /^(\d{4})-(\d{1,2})$/.exec(raw);
  if (!m) return true;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return true;
  const now = new Date();
  const months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  return months < 120;
}

function OwnerFields({ data, setField, setMany, deriveFullName, isAccordLOC, onSba = false, countryCode, regionCountry, regionLabel, postalLabel, identityLabel, errors = {}, touched = {}, onBlurField = () => {}, fieldPrefix = "" }) {
  const L = components.form.label;
  // BF_CLIENT_STEP4_VALIDATION_v171 - an error shows only once the user has
  // left the field, so nothing turns red while they are still typing into it.
  const showErr = (key) => (touched[key] && errors[key]) || "";
  const errStyle = { color: "#b3261e", fontSize: 13, marginTop: 4, lineHeight: 1.4 };
  // Field wrapper: labels the input for the scroll-to-first-error pass and
  // renders the message directly beneath it.
  const F = (key, label, control) => (
    <div data-field={`${fieldPrefix}${key}`}>
      <label style={L}>{label}</label>
      <div onBlur={() => onBlurField(key)}>{control}</div>
      {showErr(key) ? <div style={errStyle} role="alert">{showErr(key)}</div> : null}
    </div>
  );
  // BF_CLIENT_STEP4_TWO_COLUMN_v211
  // This container has always been two-column. What read as a single column was
  // the Form 912 block, where each question carried gridColumn "1 / -1". Those
  // four are now narrowed. Section eyebrows and the address fields keep the
  // full-width override on purpose: headings that span both columns read as
  // headings, and a wrapped address line is the field applicants mistype most.
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
      {F("firstName", "First Name", <Input autoComplete="given-name" value={data.firstName || ""} onChange={(e) => setName("firstName", e.target.value)} />)}
      {F("lastName", "Last Name", <Input autoComplete="family-name" value={data.lastName || ""} onChange={(e) => setName("lastName", e.target.value)} />)}
      {F("email", "Email", <Input type="email" autoComplete="email" value={data.email || ""} onChange={(e) => setField("email", e.target.value)} />)}
      {F("phone", "Mobile Phone", <PhoneInput value={formatPhoneNumber(data.phone || "", countryCode)} onChange={(e) => setField("phone", formatPhoneNumber(e.target.value, countryCode))} />)}
      {isAccordLOC && (
        <div><label style={L}>Home Phone</label><PhoneInput value={formatPhoneNumber(data.homePhone || "", countryCode)} onChange={(e) => setField("homePhone", formatPhoneNumber(e.target.value, countryCode))} /></div>
      )}
      {F("dob", "Date of Birth", <Input type="date" autoComplete="bday" value={data.dob || ""} onChange={(e) => setField("dob", e.target.value)} />)}
      {F("ssn", identityLabel, <Input inputMode="numeric" autoComplete="off" value={formatIdentityNumber(data.ssn || "", countryCode)} onChange={(e) => setField("ssn", formatIdentityNumber(e.target.value, countryCode))} />)}
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
      {/* BF_CLIENT_STEP4_ADDRESS_SINCE_v139 - the SBA block below asks for this
          too. Rendering both would put two controls on one field. */}
      {isAccordLOC && !onSba && (
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

      {/* BF_CLIENT_SBA_912_STEP4_v197
          SBA Form 912, Statement of Personal History. Everything here is per
          person, which is why it sits inside OwnerFields and repeats for the
          partner. Q8, Q9 and Q10 each carry their own initial on the paper form -
          a single signature at the end is not accepted - so each is captured
          separately rather than as one combined disclosure.
          Nothing is required: staff chase what is missing rather than the form
          refusing to advance. */}
      {onSba && (
        <>
          <div style={{ gridColumn: "1 / -1", ...components.form.eyebrow, marginTop: tokens.spacing.md }}>
            SBA personal history (Form 912)
          </div>
          <div><label style={L}>Place of birth (city and state, or country)</label>
            <Input value={data.placeOfBirth || ""} onChange={(e) => setField("placeOfBirth", e.target.value)} /></div>
          <div><label style={L}>Are you a US citizen?</label>
            <select value={data.usCitizen || ""} onChange={(e) => setField("usCitizen", e.target.value)}>
              <option value="">Select...</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          {data.usCitizen === "no" && (
            <div><label style={L}>Alien registration number</label>
              <Input value={data.alienRegistrationNumber || ""} onChange={(e) => setField("alienRegistrationNumber", e.target.value)} placeholder="Leave blank if you do not have one" /></div>
          )}
          {/* BF_CLIENT_STEP4_ADDRESS_SINCE_v139
              Paired deliberately: former names sat alone with an empty cell
              beside it, and the 912 needs the residence date the server had no
              way to fill. */}
          <div><label style={L}>Any former names used, and when <span style={{ color: tokens.colors.textSecondary, fontWeight: 400 }}>(optional)</span></label>
            <Input value={data.formerNames || ""} onChange={(e) => setField("formerNames", e.target.value)} placeholder="e.g. Jane Smith, 2010-2018" /></div>
          <div><label style={L}>At this address since</label>
            <MonthYearSelect ariaLabel="At this address since" value={data.addressSince || ""} onChange={(v) => setField("addressSince", v)} /></div>
          {/* 912 asks for the previous address only when under ten years at the
              current one. Until v139 that rule was a comment and the field was
              always shown; now addressSince is collected it can be applied. The
              field stays visible while addressSince is blank, so nobody is
              blocked from answering by not having answered yet. */}
          {underTenYearsAtAddress(data.addressSince) && (
            <div style={{ gridColumn: "1 / -1" }}><label style={L}>Previous address, if you have been at your current address under 10 years</label>
              <Input value={data.priorAddress || ""} onChange={(e) => setField("priorAddress", e.target.value)} placeholder="Street, city, state, ZIP - and the dates you lived there" /></div>
          )}

          {/* BF_CLIENT_SBA_YES_DETAIL_v214
              A Yes on any of these needs supporting detail. That was previously
              collected as "sba_1919_attachments" - an upload row in the
              mini-portal, days later, labelled only "Supporting detail for any
              Yes answer on Form 1919". By then the applicant has no idea which
              answer it refers to, and nothing tells them.
              Ask here instead, while the question is on screen and the answer is
              the one they just gave. */}
          <div><label style={L}>
            Are you currently incarcerated, serving a sentence, or under indictment for a felony
            or any crime involving financial misconduct or a false statement?
          </label>{yn("sba912Q8")}
            {data.sba912Q8 === "yes" && (
              <div style={{ marginTop: 8 }}>
                <label style={L}>Please give the details</label>
                <textarea
                  value={data.sba912Q8Detail || ""}
                  onChange={(e) => setField("sba912Q8Detail", e.target.value)}
                  placeholder="Charge or offence, date, jurisdiction, and current status"
                  rows={3}
                  style={{ ...components.form.input, width: "100%", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            )}
          </div>

          <div><label style={L}>
            In the past year, have you been convicted of a criminal offence committed during and
            in connection with a riot, civil disorder or other declared disaster?
          </label>{yn("sba912Q9")}
            {data.sba912Q9 === "yes" && (
              <div style={{ marginTop: 8 }}>
                <label style={L}>Please give the details</label>
                <textarea
                  value={data.sba912Q9Detail || ""}
                  onChange={(e) => setField("sba912Q9Detail", e.target.value)}
                  placeholder="Offence, date, jurisdiction, and the outcome"
                  rows={3}
                  style={{ ...components.form.input, width: "100%", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            )}
          </div>

          <div><label style={L}>
            Are you currently more than 60 days late on any child support obligation?
          </label>{yn("sba912Q10")}
            {data.sba912Q10 === "yes" && (
              <div style={{ marginTop: 8 }}>
                <label style={L}>Please give the details</label>
                <textarea
                  value={data.sba912Q10Detail || ""}
                  onChange={(e) => setField("sba912Q10Detail", e.target.value)}
                  placeholder="Amount outstanding, jurisdiction, and any arrangement in place"
                  rows={3}
                  style={{ ...components.form.input, width: "100%", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            )}
          </div>

          <div><label style={L}>
            Your initials, confirming the three answers above
          </label><Input value={data.sba912Initials || ""} onChange={(e) => setField("sba912Initials", e.target.value.toUpperCase())} placeholder="e.g. WJ" maxLength={5} /></div>

          <div style={{ gridColumn: "1 / -1", ...components.form.eyebrow, marginTop: tokens.spacing.md }}>
            Demographics (optional, for SBA reporting only)
          </div>
          <div><label style={L}>Veteran status</label>
            <select value={data.veteranStatus || ""} onChange={(e) => setField("veteranStatus", e.target.value)}>
              <option value="">Not disclosed</option>
              <option value="non_veteran">Non-veteran</option>
              <option value="veteran">Veteran</option>
              <option value="service_disabled">Service-disabled veteran</option>
              <option value="spouse">Spouse of veteran</option>
            </select>
          </div>
          <div><label style={L}>Sex</label>
            <select value={data.sex || ""} onChange={(e) => setField("sex", e.target.value)}>
              <option value="">Not disclosed</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div><label style={L}>Race</label>
            <select value={data.race || ""} onChange={(e) => setField("race", e.target.value)}>
              <option value="">Not disclosed</option>
              <option value="american_indian">American Indian or Alaska Native</option>
              <option value="asian">Asian</option>
              <option value="black">Black or African American</option>
              <option value="pacific_islander">Native Hawaiian or Pacific Islander</option>
              <option value="white">White</option>
            </select>
          </div>
          <div><label style={L}>Ethnicity</label>
            <select value={data.ethnicity || ""} onChange={(e) => setField("ethnicity", e.target.value)}>
              <option value="">Not disclosed</option>
              <option value="hispanic">Hispanic or Latino</option>
              <option value="not_hispanic">Not Hispanic or Latino</option>
            </select>
          </div>
        </>
      )}
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


// BF_CLIENT_STEP4_VALIDATION_v171
// Human labels so a message reads "Enter the date of birth" rather than
// "dob is required".
const LABELS = {
  firstName: "first name",
  lastName: "last name",
  email: "email address",
  phone: "mobile phone number",
  street: "street address",
  city: "city",
  state: "province or state",
  zip: "postal or ZIP code",
  dob: "date of birth",
  ssn: "identity number",
  ownership: "ownership percentage",
};

function validateOwner(values, requiredFields, labels) {
  const out = {};
  requiredFields.forEach((field) => {
    if (!Validate.required(values[field])) {
      out[field] = `Enter the ${labels[field] || field}.`;
    }
  });
  if (!out.phone && values.phone && !Validate.phone(values.phone)) {
    out.phone = "Enter a valid 10-digit phone number.";
  }
  if (!out.email && values.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
    out.email = "Enter a valid email address.";
  }
  return out;
}

// Scrolling to the first problem matters most on mobile, where the summary
// banner is off-screen by the time the user starts looking.
function focusFirstError(errs, prefix) {
  if (typeof document === "undefined") return;
  const first = Object.keys(errs)[0];
  if (!first) return;
  const el = document.querySelector(`[data-field="${prefix}${first}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const input = el.querySelector("input, select, textarea");
  if (input && typeof input.focus === "function") {
    window.setTimeout(() => input.focus({ preventScroll: true }), 300);
  }
}

export function Step4_Applicant() {
  const { app, update, autosaveError } = useApplicationStore();
  const readiness = useReadiness();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);
  // BF_CLIENT_STEP4_VALIDATION_v171 - per-field errors, and which fields the
  // user has actually left. Nothing shows red until a field is touched.
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const handleBlurField = (key) => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const values = { ...app.applicant };
  const partner = values.partner || {};
  const isAccordLOC = isAccordLOCApp(app); // BF_CLIENT_BLOCK_v710_ACCORD_STEP4_v1
  const countryCode = useMemo(
    () => getCountryCode(app.kyc.businessLocation),
    [app.kyc.businessLocation]
  );
  const identityLabel = getIdentityLabel(countryCode);
  // BF_CLIENT_SBA_912_STEP4_v197
  const onSba = isStartupPathKyc((app?.kyc ?? {}) as Record<string, unknown>);
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
    // BF_CLIENT_STEP4_VALIDATION_v171 - see validateOwner below; the banner is
    // kept as a summary but the field-level messages are what people act on.
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

    // BF_CLIENT_STEP4_VALIDATION_v171 - collect EVERY problem, not just the
    // first, so the user fixes the form in one pass instead of submitting
    // repeatedly to discover one more blank field each time.
    const applicantErrors = validateOwner(values, requiredFields, LABELS);
    setErrors(applicantErrors);
    setTouched((prev) => {
      const next = { ...prev };
      Object.keys(applicantErrors).forEach((k) => { next[k] = true; });
      return next;
    });
    if (Object.keys(applicantErrors).length > 0) {
      setSaveError("Please correct the highlighted fields below.");
      focusFirstError(applicantErrors, "");
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

    // BF_CLIENT_SBA_PATH_RULES_v204
    // The applicant and partner already require an email above. Additional
    // shareholders carry an email field that nothing validated, and SBA resolves
    // its signers from that same list. SignNow cannot address an envelope
    // without an email, so a 20%+ owner with a blank one is skipped at signing -
    // and the server's dispatch gate (BF_SERVER_SBA_V103) now correctly refuses
    // to release a package missing that owner's signed Form 413. The file would
    // simply park, with nothing on screen to explain why. Catch it here, at the
    // point the address is actually being asked for.
    if (onSba) {
      const shareholders = Array.isArray(values.additionalShareholders)
        ? values.additionalShareholders
        : [];
      const emailShape = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      for (let i = 0; i < shareholders.length; i += 1) {
        const row = shareholders[i] || {};
        const pct = Number(row.ownership || 0);
        // Unstated ownership is treated as significant, matching the server's
        // resolveSbaOwners, which keeps owners whose percentage is 0/unstated.
        if (pct > 0 && pct < 20) continue;
        const email = String(row.email || "").trim();
        if (!email || !emailShape.test(email)) {
          setSaveError(
            `Owner ${i + 1} in Additional Shareholders needs a valid email address. ` +
            "Every owner of 20% or more signs their own SBA forms, so each one needs their own address.",
          );
          return;
        }
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
    // BF_CLIENT_SBA_SKIP_DOCS_v192
    // A start-up has none of what Step 5 asks for - six months of bank statements
    // and filed financials do not exist for a business that has not traded. Sending
    // them to a screen listing documents they cannot produce is a dead end at the
    // last hurdle, after they have already answered everything else.
    //
    // documentsDeferred is set BEFORE navigating because it is what the Step 6
    // submit gate checks (see submission.deferredGate); without it the applicant
    // arrives at Review with the submit button disabled and nothing explaining why.
    //
    // currentStep is set to 6 rather than 5 for a second reason: Step 6 runs
    // resolveStepGuard(app.currentStep, 6), and resolveStepGuard(4, 6) returns 5.
    // Leaving the step at 4 or 5 would bounce them straight back into Documents.
    if (isStartupPathKyc((app?.kyc ?? {}) as Record<string, unknown>)) {
      update({ currentStep: 6, documentsDeferred: true });
      navigate("/apply/step-6");
      return;
    }
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

  // BF_CLIENT_STEP34_GUIDE_v156
  // Derived from the same predicate that gates Continue, so the two cannot
  // describe different sets. Ownership is called out separately because a
  // partner split that does not total 100 is a different problem from a blank
  // field, and "ownership" alone would send them looking for an empty box.
  const STEP4_LABELS: Record<string, string> = {
    firstName: "first name", lastName: "last name", email: "email",
    phone: "phone number", street: "street address", city: "city",
    state: "province or state", zip: "postal or ZIP code",
    dob: "date of birth", ssn: identityLabel.toLowerCase(), ownership: "ownership %",
  };
  const missingStep4 = (() => {
    const out = baseRequiredFields
      .filter((f) => !Validate.required(values[f]))
      .map((f) => STEP4_LABELS[f] ?? f);
    // Deliberately not calling impliesMultipleOwners: that arrives in v150 and
    // this block must stand on its own. Reads the stored flag as well as the
    // percentage so it is correct before and after that change.
    const pct = Number(values.ownership || 0);
    const hasPartner = (pct > 0 && pct < 100) || Boolean(values.hasMultipleOwners);
    if (hasPartner) {
      const p = values.partner || {};
      for (const f of partnerRequiredFields) {
        if (!Validate.required(p[f])) out.push(`partner ${STEP4_LABELS[f] ?? f}`);
      }
    }
    const { ownershipTotalValid, ownershipRangeValid } = getOwnershipValidity(values);
    if (ownershipRangeValid && !ownershipTotalValid) {
      out.push("ownership adding up to 100% across every owner");
    }
    return out;
  })();

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
            <StepHeader step={4} title="Applicant Information" subtitle="List everyone with 20%+ ownership - that is the SBA threshold. Each of them signs their own copy." /* BF_CLIENT_OWNERSHIP_20_v145 */ />
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
              {/* BF_CLIENT_SBA_912_STEP4_v197 */}
              <OwnerFields errors={errors} touched={touched} onBlurField={handleBlurField}
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
                onSba={onSba}
              />
              {/* BF_CLIENT_STEP4_PARTNER_TOGGLE_v194
                  This was gated on ownership < 100 alone, which trapped anyone who
                  ticked the box and then changed their mind:
                    1. set ownership to 60, checkbox appears, tick it
                    2. partner card opens, hasMultipleOwners = true
                    3. set ownership back to 100 - the checkbox UNMOUNTS
                    4. the partner card stays open, because it renders on
                       hasMultipleOwners alone (below), and nothing on screen can
                       set the flag back to false
                  Continue then becomes unsatisfiable: isStepValid demands every
                  partner field, and ownershipTotalValid demands primary + partner
                  === 100, so with the primary at 100 the partner needs 0 - which
                  fails the separate partnerOwnership >= 1 range check. The only
                  escapes were dropping ownership below 100 again, or clearing
                  local storage. A live applicant hit exactly this.
                  The box now also shows whenever it is already ticked, so the
                  control that opened the partner section can always close it. */}
              {(Number(values.ownership || 0) < 100 || values.hasMultipleOwners) && (
                <label style={{ display: "flex", alignItems: "center", gap: tokens.spacing.xs, fontSize: tokens.typography.label.fontSize, fontWeight: tokens.typography.label.fontWeight, color: tokens.colors.textPrimary }}>
                  <Checkbox
                    checked={values.hasMultipleOwners || false}
                    onChange={(e) => {
                      const checked = (e.target as HTMLInputElement).checked;
                      // Unticking clears the partner outright. Leaving a half-filled
                      // partner object behind means a stale SIN or email is still in
                      // state and can reach the server on submit.
                      if (!checked) {
                        update({ applicant: { ...values, hasMultipleOwners: false, partner: {}, additionalShareholders: [] } });
                        return;
                      }
                      setField("hasMultipleOwners", true);
                    }}
                  />
                  This business has multiple owners/partners
                </label>
              )}
            </Card>

            {values.hasMultipleOwners && (
              <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg, marginTop: tokens.spacing.lg }} onBlurCapture={() => saveStepData(4, values)}>
                <div style={components.form.eyebrow}>Partner / second owner</div>
                {/* BF_CLIENT_SBA_912_STEP4_v197 */}
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
                  onSba={onSba}
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
                {/* BF_CLIENT_SBA_WIZARD_FLOW_v210 - SBA skips Step 5 because its
                    documents are collected in Stage 2, so describe the real destination. */}
                {/* BF_CLIENT_STEP34_GUIDE_v156 - see Step 3. */}
                <Button
                  style={{ width: "100%", maxWidth: "260px" }}
                  onClick={() => {
                    if (!isValid) {
                      setSaveError(
                        missingStep4.length === 1
                          ? `One thing left: ${missingStep4[0]}.`
                          : `${missingStep4.length} things left: ${missingStep4.join(", ")}.`,
                      );
                      return;
                    }
                    setSaveError(null);
                    void next();
                  }}
                  aria-disabled={!isValid}
                >{onSba ? "Continue to Review →" : "Continue to Documents →"}</Button>
              </div>
            </div>
          </div>
        </WizardLayout>
    </>
  );
}

export default Step4_Applicant;
