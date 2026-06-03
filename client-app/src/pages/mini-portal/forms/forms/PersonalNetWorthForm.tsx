// BF_CLIENT_BLOCK_v304_ACCORD_FORMS_REBUILD_v1 — Personal Statement of Affairs.
// Rebuilt to Accord's 2024 Personal Net Worth Statement: primary-only vs joint
// (with spouse) declaration, sources of income, disclosures, and the page-2
// assets/liabilities grid with computed net worth.
// Persists via the generic form-responses endpoint, key "net_worth_statement".
import { useEffect, useMemo, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";

const FORM_KEY = "net_worth_statement";

type Data = Record<string, string>;

const ASSET_ROWS: Array<{ key: string; label: string }> = [
  { key: "asset_cash", label: "Cash" },
  { key: "asset_rrsp", label: "RRSP" },
  { key: "asset_tfsa", label: "TFSA" },
  { key: "asset_stocks", label: "Stocks / Bonds" },
  { key: "asset_ar", label: "Accounts Receivable" },
  { key: "asset_liquid_other", label: "Other (liquid)" },
  { key: "asset_vehicle_1", label: "Vehicle 1" },
  { key: "asset_vehicle_2", label: "Vehicle 2" },
  { key: "asset_vehicle_3", label: "Vehicle 3" },
  { key: "asset_realestate_1", label: "Real estate 1" },
  { key: "asset_realestate_2", label: "Real estate 2" },
  { key: "asset_realestate_3", label: "Real estate 3" },
  { key: "asset_shareholder_loans", label: "Shareholder loans" },
  { key: "asset_nontangible_other", label: "Other (non-tangible)" },
  { key: "asset_other_1", label: "Other asset 1" },
  { key: "asset_other_2", label: "Other asset 2" },
  { key: "asset_other_3", label: "Other asset 3" },
];

const LIAB_ROWS: Array<{ key: string; label: string }> = [
  { key: "liab_credit_cards", label: "Credit cards (total)" },
  { key: "liab_rrsp_loans", label: "RRSP loans (total)" },
  { key: "liab_other_loans", label: "Other loans (total)" },
  { key: "liab_stock_margin", label: "Stock margin debt" },
  { key: "liab_loc", label: "Line of credit (total)" },
  { key: "liab_cra_debt", label: "Taxes owing / CRA debt" },
  { key: "liab_vehicle_1", label: "Loan on vehicle 1" },
  { key: "liab_vehicle_2", label: "Loan on vehicle 2" },
  { key: "liab_vehicle_3", label: "Loan on vehicle 3" },
  { key: "liab_mortgage_1", label: "Mortgage on real estate 1" },
  { key: "liab_mortgage_2", label: "Mortgage on real estate 2" },
  { key: "liab_mortgage_3", label: "Mortgage on real estate 3" },
  { key: "liab_nontangible", label: "Debt for non-tangible assets" },
  { key: "liab_liens_1", label: "Lien on other asset 1" },
  { key: "liab_liens_2", label: "Lien on other asset 2" },
  { key: "liab_liens_3", label: "Lien on other asset 3" },
];

const INCOME_ROWS: Array<{ key: string; label: string }> = [
  { key: "employment", label: "Employment income" },
  { key: "dividend", label: "Dividend income" },
  { key: "rental", label: "Rental income" },
  { key: "investment", label: "Investment income" },
  { key: "other_1", label: "Other" },
  { key: "other_2", label: "Other" },
];

const DISCLOSURES: string[] = [
  "Previous dealings with Boreal Financial (any division or subsidiary)?",
  "Ever filed for bankruptcy, consumer proposal, or any form of insolvency?",
  "Ever convicted of a criminal offence not pardoned?",
  "Income taxes for previous year(s) fully satisfied?",
  "Any legal actions, pending/looming actions or judgments against you?",
  "Are you a co-signor, guarantor or obligor to any other party's debts?",
];

const num = (v: string | undefined) => {
  const n = parseFloat((v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", margin: "8px 0 2px" } as const;
const inp = { width: "100%", padding: "7px 9px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5, boxSizing: "border-box" as const } as const;
const sectionH = { fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "20px 0 6px" } as const;
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } as const;
const th = { textAlign: "left" as const, padding: "6px 8px", fontSize: 11, fontWeight: 600, color: "#475569", borderBottom: "1px solid #e5e7eb" } as const;
const td = { padding: "4px 8px", borderBottom: "1px solid #f1f5f9" } as const;

export default function PersonalNetWorthForm({
  applicationId,
  prefill,
  onComplete,
}: { applicationId: string; prefill?: Record<string, unknown>; onComplete: () => void }) {
  const [joint, setJoint] = useState(false);
  const [data, setData] = useState<Data>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const pre: Data = {};
      if (prefill) {
        const p = prefill as Record<string, string | undefined>;
        const mapped: Record<string, string | undefined> = {
          primary_name: p.fullName,
          primary_email: p.email,
          primary_cell: p.cellPhone,
          primary_home_phone: p.homePhone,
          primary_work_phone: p.workPhone,
          primary_sin: p.sin,
          primary_dob: p.dob,
          primary_home_address: p.street,
          primary_physical_address: p.street,
        };
        for (const [k, v] of Object.entries(mapped)) if (typeof v === "string" && v) pre[k] = v;
      }
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        if (existing?.data) {
          const d = existing.data as { joint?: boolean; fields?: Data };
          setJoint(!!d.joint);
          setData({ ...pre, ...(d.fields ?? {}) });
          setSubmitted(!!existing.submitted_at);
          return;
        }
      } catch {
        // first open
      }
      setData(pre);
    })();
  }, [applicationId, prefill]);

  const set = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const persist = () => { void saveFormResponse(applicationId, FORM_KEY, { joint, fields: data }).catch(() => {}); };

  const totals = useMemo(() => {
    const assets = ASSET_ROWS.reduce((s, r) => s + num(data[r.key]), 0);
    const liabilities = LIAB_ROWS.reduce((s, r) => s + num(data[r.key]), 0);
    return { assets, liabilities, net: assets - liabilities };
  }, [data]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitFormResponse(applicationId, FORM_KEY, {
        joint,
        fields: data,
        totals,
        submitted_at: new Date().toISOString(),
      });
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const f = (key: string, label: string) => (
    <div key={key}>
      <label style={lbl}>{label}</label>
      <input style={inp} value={data[key] ?? ""} onChange={(e) => set(key, e.target.value)} onBlur={persist} />
    </div>
  );

  return (
    <div onBlur={persist}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Personal Statement of Affairs</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
        Personal net worth declaration.
        {submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      <label style={{ display: "block", fontSize: 14, margin: "8px 0" }}>
        <input type="checkbox" checked={joint} onChange={(e) => setJoint(e.target.checked)} />{" "}
        Joint declaration (Primary Party and Spouse / Common-law partner)
      </label>

      <div style={sectionH}>Primary Party</div>
      <div style={grid2}>
        {f("primary_name", "Full legal name")}
        {f("primary_sin", "SIN")}
        {f("primary_alt_names", "Alternate name(s)")}
        {f("primary_prior_names", "Prior name(s)")}
        {f("primary_dob", "Date of birth")}
        {f("primary_marital", "Marital status")}
        {f("primary_dependents", "Number of dependents")}
        {f("primary_home_phone", "Home #")}
        {f("primary_cell", "Cell phone")}
        {f("primary_work_phone", "Work #")}
        {f("primary_email", "Personal email")}
        {f("primary_work_email", "Work email")}
      </div>
      {f("primary_home_address", "Full home address")}
      {f("primary_physical_address", "Physical address (if different)")}

      <div style={sectionH}>Personal References</div>
      {[1, 2, 3].map((n) => (
        <div key={n} style={grid2}>
          {f(`ref${n}_name`, `Reference ${n} — name`)}
          {f(`ref${n}_rel`, "Relationship")}
          {f(`ref${n}_address`, "Address")}
          {f(`ref${n}_phone`, "Cell phone")}
        </div>
      ))}

      {joint && (
        <>
          <div style={sectionH}>Spouse / Common-law Partner</div>
          <div style={grid2}>
            {f("spouse_name", "Spouse name")}
            {f("spouse_sin", "SIN")}
            {f("spouse_alt_names", "Alternate name(s)")}
            {f("spouse_prior_names", "Prior name(s)")}
            {f("spouse_dob", "Date of birth")}
            {f("spouse_employer", "Employer")}
            {f("spouse_employer_phone", "Employer phone #")}
            {f("spouse_home_phone", "Home #")}
            {f("spouse_cell", "Cell phone")}
            {f("spouse_work_phone", "Work #")}
            {f("spouse_email", "Personal email")}
            {f("spouse_work_email", "Work email")}
          </div>
        </>
      )}

      <div style={sectionH}>Sources of Income (annual)</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Income type</th>
            <th style={th}>Primary party</th>
            {joint && <th style={th}>Spouse</th>}
          </tr>
        </thead>
        <tbody>
          {INCOME_ROWS.map((r) => (
            <tr key={r.key}>
              <td style={td}>{r.label}</td>
              <td style={td}><input style={inp} value={data[`inc_${r.key}_primary`] ?? ""} onChange={(e) => set(`inc_${r.key}_primary`, e.target.value)} onBlur={persist} /></td>
              {joint && <td style={td}><input style={inp} value={data[`inc_${r.key}_spouse`] ?? ""} onChange={(e) => set(`inc_${r.key}_spouse`, e.target.value)} onBlur={persist} /></td>}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={sectionH}>Disclosures</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Question</th>
            <th style={th}>Primary</th>
            {joint && <th style={th}>Spouse</th>}
          </tr>
        </thead>
        <tbody>
          {DISCLOSURES.map((q, i) => (
            <tr key={i}>
              <td style={td}>{q}</td>
              <td style={td}>
                <select style={inp} value={data[`disc_${i}_primary`] ?? ""} onChange={(e) => set(`disc_${i}_primary`, e.target.value)} onBlur={persist}>
                  <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
                </select>
              </td>
              {joint && (
                <td style={td}>
                  <select style={inp} value={data[`disc_${i}_spouse`] ?? ""} onChange={(e) => set(`disc_${i}_spouse`, e.target.value)} onBlur={persist}>
                    <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
                  </select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {f("disclosure_details", "Additional disclosure / details")}

      <div style={sectionH}>Assets &amp; Liabilities</div>
      <div style={grid2}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Assets</div>
          {ASSET_ROWS.map((r) => f(r.key, r.label))}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Liabilities</div>
          {LIAB_ROWS.map((r) => f(r.key, r.label))}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}>
        <div>Total assets: <strong>{money(totals.assets)}</strong></div>
        <div>Total liabilities: <strong>{money(totals.liabilities)}</strong></div>
        <div style={{ marginTop: 4 }}>Net worth: <strong>{money(totals.net)}</strong></div>
      </div>

      {error && <p style={{ color: "#991b1b", fontSize: 13, marginTop: 12 }}>{error}</p>}

      <button type="button" disabled={submitting} onClick={() => void handleSubmit()}
        style={{ marginTop: 16, padding: "12px 24px", background: "#0b1320", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600, opacity: submitting ? 0.6 : 1 }}>
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
