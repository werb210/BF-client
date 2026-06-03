// BF_CLIENT_BLOCK_v304_ACCORD_FORMS_REBUILD_v1 — Real Estate Collateral.
// Per-property real-estate disclosure for collateral mortgages, modeled on
// Accord's Collateral Mortgage Form (v07012025). Supports multiple properties.
// Persists via the generic form-responses endpoint, key "real_estate_collateral_disclosure".
import { useEffect, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";

const FORM_KEY = "real_estate_collateral_disclosure";

type Property = Record<string, string>;

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

const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", margin: "8px 0 2px" } as const;
const inp = { width: "100%", padding: "7px 9px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5, boxSizing: "border-box" as const } as const;
const sectionH = { fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "16px 0 4px" } as const;
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } as const;
const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 } as const;

export default function RealEstateCollateralForm({
  applicationId,
  prefill,
  onComplete,
}: { applicationId: string; prefill?: Record<string, unknown>; onComplete: () => void }) {
  const [properties, setProperties] = useState<Property[]>([newProperty()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const ownerName = String((prefill?.fullName ?? "") || "");
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        if (existing?.data) {
          const d = existing.data as { properties?: Property[] };
          if (Array.isArray(d.properties) && d.properties.length) {
            setProperties(d.properties.map((p) => ({ ...newProperty(), ...p })));
          }
          setSubmitted(!!existing.submitted_at);
          return;
        }
      } catch {
        // first open
      }
      if (ownerName) setProperties((ps) => ps.map((p, i): Property => (i === 0 ? { ...p, owner1: p.owner1 || ownerName } : p)));
    })();
  }, [applicationId, prefill]);

  const setField = (idx: number, key: string, value: string) =>
    setProperties((ps) => ps.map((p, i): Property => (i === idx ? { ...p, [key]: value } : p)));

  const addProperty = () => setProperties((ps) => [...ps, newProperty()]);
  const removeProperty = (idx: number) =>
    setProperties((ps) => (ps.length > 1 ? ps.filter((_, i) => i !== idx) : ps));

  const persist = () => { void saveFormResponse(applicationId, FORM_KEY, { properties }).catch(() => {}); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitFormResponse(applicationId, FORM_KEY, { properties, submitted_at: new Date().toISOString() });
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (idx: number, key: string, label: string, placeholder = "") => (
    <div>
      <label style={lbl}>{label}</label>
      <input style={inp} value={properties[idx][key] ?? ""} placeholder={placeholder}
        onChange={(e) => setField(idx, key, e.target.value)} onBlur={persist} />
    </div>
  );

  const yesNo = (idx: number, key: string, label: string) => (
    <div>
      <label style={lbl}>{label}</label>
      <select style={inp} value={properties[idx][key] ?? ""} onChange={(e) => { setField(idx, key, e.target.value); }} onBlur={persist}>
        <option value="">—</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  );

  const mortgage = (idx: number, n: 1 | 2 | 3) => (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{n === 1 ? "1st" : n === 2 ? "2nd" : "3rd"} Mortgage</div>
      <div style={grid3}>
        {field(idx, `m${n}_lender`, "Lender")}
        {field(idx, `m${n}_type`, "Type")}
        {field(idx, `m${n}_balance`, "Balance")}
        {field(idx, `m${n}_charge`, "Registered charge")}
        {field(idx, `m${n}_payment`, "Monthly payment")}
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Real Estate Collateral</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
        Details on real estate offered as additional collateral. Complete one block per property.
        {submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      {properties.map((_, idx) => (
        <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 14 }}>Property #{idx + 1}</strong>
            {properties.length > 1 && (
              <button type="button" onClick={() => removeProperty(idx)} style={{ border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer", fontSize: 13 }}>Remove</button>
            )}
          </div>

          {field(idx, "street", "Number & Street")}
          <div style={grid2}>
            {field(idx, "city_province", "City / Province")}
            {field(idx, "legal_address", "Legal address (if known)")}
          </div>

          <div style={sectionH}>Owners</div>
          <div style={grid2}>
            {field(idx, "owner1", "Owner 1 — full legal name")}
            {field(idx, "owner1_marital", "Owner 1 — marital status")}
            {field(idx, "owner2", "Owner 2 — full legal name")}
            {field(idx, "owner2_marital", "Owner 2 — marital status")}
            {field(idx, "owner3", "Owner 3 — full legal name")}
            {field(idx, "owner3_marital", "Owner 3 — marital status")}
          </div>
          <div style={grid2}>
            {yesNo(idx, "matrimonial", "Family / matrimonial home?")}
            {field(idx, "matrimonial_which", "If yes, which owner(s)?")}
          </div>

          <div style={sectionH}>Occupancy & Value</div>
          <div style={grid3}>
            {yesNo(idx, "rented", "Rented?")}
            {field(idx, "rental_income_monthly", "Rental income (monthly)")}
            {field(idx, "renter_names", "Renter name(s)")}
          </div>
          <div style={grid2}>
            {field(idx, "property_type", "Property type")}
            {field(idx, "purchase_price", "Purchase price")}
            {field(idx, "purchase_when", "Purchased when")}
            {field(idx, "present_value", "Present value")}
            {field(idx, "value_method", "Value method")}
          </div>

          <div style={sectionH}>Mortgages</div>
          {mortgage(idx, 1)}
          {mortgage(idx, 2)}
          {mortgage(idx, 3)}

          <div style={sectionH}>Disclosures</div>
          <div style={grid2}>
            {yesNo(idx, "taxes_current", "Property taxes current?")}
            {yesNo(idx, "other_charges", "Other charges on title?")}
          </div>
          {field(idx, "other_charges_details", "If yes, details")}
          {field(idx, "other_disclosures", "Other disclosure(s)")}
        </div>
      ))}

      <button type="button" onClick={addProperty} style={{ border: "1px solid #cbd5e1", background: "#fff", padding: "8px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "#0f172a" }}>
        + Add another property
      </button>

      {error && <p style={{ color: "#991b1b", fontSize: 13, marginTop: 12 }}>{error}</p>}

      <div style={{ marginTop: 16 }}>
        <button type="button" disabled={submitting} onClick={() => void handleSubmit()}
          style={{ padding: "12px 24px", background: "#0b1320", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
