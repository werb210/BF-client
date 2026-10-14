// BF_CLIENT_BLOCK_v304_ACCORD_FORMS_REBUILD_v1 — Real Estate Collateral.
// Per-property real-estate disclosure for collateral mortgages, modeled on
// Accord's Collateral Mortgage Form (v07012025). Supports multiple properties.
// Persists via the generic form-responses endpoint, key "real_estate_collateral_disclosure".
// BF_CLIENT_v805_FORMS - phone layout: owners 2-3 and mortgages 2-3 stay behind
// "+ Add owner" / "+ Add mortgage" until used (the hidden fields still submit
// as empty strings, exactly as before), money keypads, pinned Submit, and a
// localStorage draft so nothing typed is lost when the sheet closes.
import { useEffect, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";
import { A11Y_COLORS } from "@/styles/a11yColors"; // BF_CLIENT_v789_CONTRAST
import { MoneyInput, mergeDraft, readDraft, useFormDraft } from "../cmpFormKit";

const FORM_KEY = "real_estate_collateral_disclosure";

type Property = Record<string, string>;
type Reveal = { owners: number; mortgages: number };

const newProperty = (): Property => ({
  street: "", city_province: "", legal_address: "",
  owner1: "", owner1_marital: "", owner2: "", owner2_marital: "", owner3: "", owner3_marital: "",
  matrimonial: "", matrimonial_which: "",
  rented: "", rental_income_monthly: "", renter_names: "",
  property_type: "",
  purchase_price: "", purchase_when: "", present_value: "", value_method: "",
  m1_lender: "", m1_type: "", m1_balance: "", m1_charge: "", m1_payment: "",
  m2_lender: "", m2_type: "", m2_balance: "", m2_charge: "", m2_payment: "",
  m3_lender: "", m3_type: "", m3_balance: "", m3_charge: "", m3_payment: "",
  taxes_current: "", other_charges: "", other_charges_details: "", other_disclosures: "",
});

const MONEY_KEYS = /(_balance|_charge|_payment|purchase_price|present_value|rental_income_monthly)$/;
const has = (p: Property, keys: string[]) => keys.some((k) => String(p[k] ?? "").trim() !== "");
const ownersWithData = (p: Property) => (has(p, ["owner3", "owner3_marital"]) ? 3 : has(p, ["owner2", "owner2_marital"]) ? 2 : 1);
const mortgagesWithData = (p: Property) => {
  const m = (n: number) => ["lender", "type", "balance", "charge", "payment"].map((f) => `m${n}_${f}`);
  return has(p, m(3)) ? 3 : has(p, m(2)) ? 2 : 1;
};

export default function RealEstateCollateralForm({
  applicationId,
  prefill,
  onComplete,
}: { applicationId: string; prefill?: Record<string, unknown>; onComplete: () => void }) {
  const [properties, setProperties] = useState<Property[]>([newProperty()]);
  const [reveal, setReveal] = useState<Reveal[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearLocalDraft = useFormDraft(FORM_KEY, applicationId, { properties }, hydrated);

  useEffect(() => {
    const draft = readDraft<{ properties?: Property[] }>(FORM_KEY, applicationId);
    const withDraft = (ps: Property[]): Property[] =>
      draft && Array.isArray(draft.properties)
        ? mergeDraft(ps, draft.properties).map((p) => ({ ...newProperty(), ...p }))
        : ps;
    void (async () => {
      const ownerName = String((prefill?.fullName ?? "") || "");
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        if (existing?.data) {
          const d = existing.data as { properties?: Property[] };
          if (Array.isArray(d.properties) && d.properties.length) {
            setProperties(withDraft(d.properties.map((p) => ({ ...newProperty(), ...p }))));
          } else {
            setProperties((ps) => withDraft(ps));
          }
          setSubmitted(!!existing.submitted_at);
          setHydrated(true);
          return;
        }
      } catch {
        // first open
      }
      setProperties((ps) => withDraft(ownerName ? ps.map((p, i): Property => (i === 0 ? { ...p, owner1: p.owner1 || ownerName } : p)) : ps));
      setHydrated(true);
    })();
  }, [applicationId, prefill]);

  const setField = (idx: number, key: string, value: string) =>
    setProperties((ps) => ps.map((p, i): Property => (i === idx ? { ...p, [key]: value } : p)));

  const addProperty = () => setProperties((ps) => [...ps, newProperty()]);
  const removeProperty = (idx: number) => {
    if (properties.length <= 1) return;
    setProperties((ps) => (ps.length > 1 ? ps.filter((_, i) => i !== idx) : ps));
    setReveal((rs) => rs.filter((_, i) => i !== idx));
  };
  const revealOf = (idx: number): Reveal => reveal[idx] ?? { owners: 1, mortgages: 1 };
  const bump = (idx: number, k: keyof Reveal, current: number) =>
    setReveal((rs) => {
      const next = [...rs];
      for (let i = 0; i <= idx; i++) next[i] = next[i] ?? { owners: 1, mortgages: 1 };
      next[idx] = { ...next[idx], [k]: Math.min(3, current + 1) };
      return next;
    });

  const persist = () => { void saveFormResponse(applicationId, FORM_KEY, { properties }).catch(() => {}); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitFormResponse(applicationId, FORM_KEY, { properties, submitted_at: new Date().toISOString() });
      clearLocalDraft();
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (idx: number, key: string, label: string, placeholder = "") => {
    const id = `re-${idx}-${key}`;
    const common = {
      id,
      value: properties[idx][key] ?? "",
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setField(idx, key, e.target.value),
      onBlur: persist,
    };
    return (
      <div>
        <label className="cmpf-label" htmlFor={id}>{label}</label>
        {MONEY_KEYS.test(key) ? (
          <MoneyInput {...common} />
        ) : key === "purchase_when" ? (
          <input className="cmpf-input" inputMode="numeric" {...common} placeholder={placeholder || "e.g. 2019"} />
        ) : (
          <input className="cmpf-input" {...common} />
        )}
      </div>
    );
  };

  const yesNo = (idx: number, key: string, label: string) => {
    const id = `re-${idx}-${key}`;
    return (
      <div>
        <label className="cmpf-label" htmlFor={id}>{label}</label>
        <select id={id} className="cmpf-select" value={properties[idx][key] ?? ""} onChange={(e) => { setField(idx, key, e.target.value); }} onBlur={persist}>
          <option value="">Select...</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
    );
  };

  const mortgage = (idx: number, n: 1 | 2 | 3) => (
    <div key={n} style={{ marginTop: 8 }} data-testid={`re-${idx}-mortgage-${n}`}>
      <div className="cmpf-sub">{n === 1 ? "1st" : n === 2 ? "2nd" : "3rd"} Mortgage</div>
      <div className="cmp-grid-3">
        {field(idx, `m${n}_lender`, "Lender")}
        {field(idx, `m${n}_type`, "Type")}
        {field(idx, `m${n}_balance`, "Balance")}
        {field(idx, `m${n}_charge`, "Registered charge")}
        {field(idx, `m${n}_payment`, "Monthly payment")}
      </div>
    </div>
  );

  const owner = (idx: number, n: 1 | 2 | 3) => (
    <div key={n} className="cmp-grid-2" data-testid={`re-${idx}-owner-${n}`}>
      {field(idx, `owner${n}`, `Owner ${n} - full legal name`)}
      {field(idx, `owner${n}_marital`, `Owner ${n} - marital status`)}
    </div>
  );

  return (
    <div className="cmpf">
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Real Estate Collateral</h2>
      <p className="cmpf-intro">
        Details on real estate offered as additional collateral. Complete one block per property.
        {submitted && <span style={{ marginLeft: 12, color: A11Y_COLORS.successText, fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      {properties.map((p, idx) => {
        const owners = Math.max(revealOf(idx).owners, ownersWithData(p));
        const mortgages = Math.max(revealOf(idx).mortgages, mortgagesWithData(p));
        return (
          <div key={idx} className="cmpf-card">
            <div className="cmpf-card-head">
              <span className="cmpf-card-title">Property #{idx + 1}</span>
              {properties.length > 1 && (
                <button type="button" className="cmpf-remove" onClick={() => removeProperty(idx)}>Remove</button>
              )}
            </div>

            {field(idx, "street", "Number & Street")}
            <div className="cmp-grid-2">
              {field(idx, "city_province", "City / Province")}
              {field(idx, "legal_address", "Legal address (if known)")}
            </div>

            <div className="cmpf-section">Owners</div>
            {([1, 2, 3] as const).filter((n) => n <= owners).map((n) => owner(idx, n))}
            {owners < 3 && (
              <button type="button" className="cmpf-add" onClick={() => bump(idx, "owners", owners)}>+ Add owner</button>
            )}
            <div className="cmp-grid-2">
              {yesNo(idx, "matrimonial", "Family / matrimonial home?")}
              {field(idx, "matrimonial_which", "If yes, which owner(s)?")}
            </div>

            <div className="cmpf-section">Occupancy &amp; Value</div>
            <div className="cmp-grid-3">
              {yesNo(idx, "rented", "Rented?")}
              {field(idx, "rental_income_monthly", "Rental income (monthly)")}
              {field(idx, "renter_names", "Renter name(s)")}
            </div>
            <div className="cmp-grid-2">
              {field(idx, "property_type", "Property type")}
              {field(idx, "purchase_price", "Purchase price")}
              {field(idx, "purchase_when", "Purchased when")}
              {field(idx, "present_value", "Present value")}
              {field(idx, "value_method", "Value method")}
            </div>

            <div className="cmpf-section">Mortgages</div>
            {([1, 2, 3] as const).filter((n) => n <= mortgages).map((n) => mortgage(idx, n))}
            {mortgages < 3 && (
              <button type="button" className="cmpf-add" onClick={() => bump(idx, "mortgages", mortgages)}>+ Add mortgage</button>
            )}

            <div className="cmpf-section">Disclosures</div>
            <div className="cmp-grid-2">
              {yesNo(idx, "taxes_current", "Property taxes current?")}
              {yesNo(idx, "other_charges", "Other charges on title?")}
            </div>
            {field(idx, "other_charges_details", "If yes, details")}
            {field(idx, "other_disclosures", "Other disclosure(s)")}
          </div>
        );
      })}

      <button type="button" className="cmpf-add" onClick={addProperty}>
        + Add another property
      </button>

      {error && <p className="cmpf-error">{error}</p>}

      <div className="cmpf-actions">
        <button type="button" className="cmpf-primary" disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
