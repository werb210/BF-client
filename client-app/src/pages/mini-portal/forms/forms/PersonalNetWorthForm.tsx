// BF_CLIENT_BLOCK_v304_ACCORD_FORMS_REBUILD_v1 — Personal Statement of Affairs.
// Rebuilt to Accord's 2024 Personal Net Worth Statement: primary-only vs joint
// (with spouse) declaration, sources of income, disclosures, and the page-2
// assets/liabilities grid with computed net worth.
// Persists via the generic form-responses endpoint, key "net_worth_statement".
// BF_CLIENT_v805_FORMS - phone layout: money keypads with "$", tables reflow
// to cards, references 2-3 behind "+ Add reference" until used, a large joint
// checkbox, pinned Submit, and a localStorage draft.
import { useEffect, useMemo, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";
import { A11Y_COLORS } from "@/styles/a11yColors"; // BF_CLIENT_v789_CONTRAST
import { MoneyInput, mergeDraft, readDraft, useFormDraft } from "../cmpFormKit"; // BF_CLIENT_v805_FORMS

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
  { key: "other_2", label: "Other (additional)" },
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

// BF_CLIENT_v805_FORMS - money fields get the decimal keypad and a "$".
const MONEY_KEY = /^(asset_|liab_|inc_)|_monthly_income$|_income_monthly$/;

export default function PersonalNetWorthForm({
  applicationId,
  prefill,
  onComplete,
}: { applicationId: string; prefill?: Record<string, unknown>; onComplete: () => void }) {
  const [joint, setJoint] = useState(false);
  const [data, setData] = useState<Data>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // BF_CLIENT_v805_FORMS
  const [hydrated, setHydrated] = useState(false);
  const [refsRevealed, setRefsRevealed] = useState(1);
  const clearLocalDraft = useFormDraft(FORM_KEY, applicationId, { joint, fields: data }, hydrated);

  useEffect(() => {
    const draft = readDraft<{ joint?: boolean; fields?: Data }>(FORM_KEY, applicationId); // BF_CLIENT_v805_FORMS
    const withDraft = (fields: Data): Data => (draft?.fields ? mergeDraft(fields, draft.fields) : fields);
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
          setJoint(!!d.joint || !!draft?.joint);
          setData(withDraft({ ...pre, ...(d.fields ?? {}) }));
          setSubmitted(!!existing.submitted_at);
          setHydrated(true);
          return;
        }
      } catch {
        // first open
      }
      if (draft?.joint) setJoint(true);
      setData(withDraft(pre));
      setHydrated(true);
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
    // BF_CLIENT_PNW_SIGN_FIX_v1 — the signer email is required: the server needs it to create
    // the one-signer SignNow envelope. Without it no signing_url comes back and signing silently
    // never happens (common for phone-OTP applicants with no email on file).
    const signerEmail = String((data as Record<string, unknown>).primary_email ?? "").trim();
    if (!signerEmail) {
      setError("Please enter your personal email above - it is required to sign your Personal Net Worth statement.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const resp = await submitFormResponse(applicationId, FORM_KEY, {
        joint,
        fields: data,
        totals,
        submitted_at: new Date().toISOString(),
      });
      clearLocalDraft(); // BF_CLIENT_v805_FORMS
      setSubmitted(true);
      // BF_CLIENT_PNW_SIGN_FIX_v1 — keep this form mounted so the signing frame can render.
      // Previously onComplete() (parent setOpenForm(null)) ran here unconditionally and
      // unmounted the component the instant the iframe was created, so PNW signing never
      // appeared. Close only when there is genuinely nothing to sign.
      if (resp?.signing_url) {
        setSigningUrl(resp.signing_url);
      } else {
        setError("We could not start signing. Please confirm your personal email above is correct, then submit again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const MARITAL_OPTIONS = ["Single", "Married", "Common-law", "Separated", "Divorced", "Widowed"];

  const formatSin = (raw: string) => {
    const d = raw.replace(/[^0-9]/g, "").slice(0, 9);
    return d.replace(/(\d{3})(\d{0,3})(\d{0,3})/, (_m: string, a: string, b: string, c: string) =>
      [a, b, c].filter(Boolean).join("-")
    );
  };

  const fieldAttrs = (key: string): { type?: string; inputMode?: "numeric" | "tel" | "email" } => {
    const k = key.toLowerCase();
    if (k.includes("dob") || k.includes("date_of_birth") || k.endsWith("_dob")) return { type: "date" };
    if (k.includes("email")) return { type: "email", inputMode: "email" };
    if (k.includes("phone") || k.includes("cell")) return { type: "tel", inputMode: "tel" };
    if (k.includes("sin") || k.includes("dependents")) return { inputMode: "numeric" };
    return {};
  };

  const f = (key: string, label: string) => {
    const k = key.toLowerCase();
    const id = `pnw-${key}`;
    if (k.includes("marital")) {
      return (
        <div key={key}>
          <label className="cmpf-label" htmlFor={id}>{label}</label>
          <select id={id} className="cmpf-select" value={data[key] ?? ""} onChange={(e) => set(key, e.target.value)} onBlur={persist}>
            <option value="">Select...</option>
            {MARITAL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }
    if (MONEY_KEY.test(key)) {
      return (
        <div key={key}>
          <label className="cmpf-label" htmlFor={id}>{label}</label>
          <MoneyInput id={id} value={data[key] ?? ""} onChange={(e) => set(key, e.target.value)} onBlur={persist} />
        </div>
      );
    }
    const isSin = k.includes("sin");
    const { type, inputMode } = fieldAttrs(key);
    return (
      <div key={key}>
        <label className="cmpf-label" htmlFor={id}>{label}</label>
        <input
          id={id}
          className="cmpf-input"
          type={type}
          inputMode={inputMode}
          value={data[key] ?? ""}
          onChange={(e) => set(key, isSin ? formatSin(e.target.value) : e.target.value)}
          onBlur={persist}
        />
      </div>
    );
  };

  // BF_CLIENT_v805_FORMS - references 2 and 3 show once used or asked for.
  const refHasData = (n: number) => ["name", "rel", "address", "phone"].some((x) => String(data[`ref${n}_${x}`] ?? "").trim() !== "");
  const refsShown = Math.max(refsRevealed, refHasData(3) ? 3 : refHasData(2) ? 2 : 1);

  const moneyCell = (key: string, label: string) => (
    <MoneyInput aria-label={label} value={data[key] ?? ""} onChange={(e) => set(key, e.target.value)} onBlur={persist} />
  );
  const yesNoCell = (key: string, label: string) => (
    <select aria-label={label} className="cmpf-select" value={data[key] ?? ""} onChange={(e) => set(key, e.target.value)} onBlur={persist}>
      <option value="">Select...</option><option value="yes">Yes</option><option value="no">No</option>
    </select>
  );

  if (signingUrl) {
    return (
      <div className="cmpf">
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Sign your Personal Net Worth statement</h2>
        <p className="cmpf-intro">
          Please review and sign below. Your statement is saved.
        </p>
        <iframe title="Sign Personal Net Worth" src={signingUrl} style={{ width: "100%", height: 620, border: "1px solid #E4EAF2", borderRadius: 8 }} />
        <div className="cmpf-actions">
          <button type="button" className="cmpf-primary" onClick={() => onComplete()}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cmpf" onBlur={persist}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Personal Statement of Affairs</h2>
      <p className="cmpf-intro">
        Personal net worth declaration.
        {submitted && <span style={{ marginLeft: 12, color: A11Y_COLORS.successText, fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      <label className="cmpf-check" style={{ marginTop: 4 }}>
        <input type="checkbox" checked={joint} onChange={(e) => setJoint(e.target.checked)} />
        <span>Joint declaration (Primary Party and Spouse / Common-law partner)</span>
      </label>

      <div className="cmpf-section">Primary Party</div>
      <div className="cmp-grid-2">
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

      <div className="cmpf-section">Personal References</div>
      {[1, 2, 3].filter((n) => n <= refsShown).map((n) => (
        <div key={n} className="cmp-grid-2" data-testid={`pnw-ref-${n}`}>
          {f(`ref${n}_name`, `Reference ${n} - name`)}
          {f(`ref${n}_rel`, "Relationship")}
          {f(`ref${n}_address`, "Address")}
          {f(`ref${n}_phone`, "Cell phone")}
        </div>
      ))}
      {refsShown < 3 && (
        <button type="button" className="cmpf-add" onClick={() => setRefsRevealed(refsShown + 1)}>+ Add reference</button>
      )}

      {joint && (
        <>
          <div className="cmpf-section">Spouse / Common-law Partner</div>
          <div className="cmp-grid-2">
            {f("spouse_sin", "SIN")}
            {f("spouse_alt_names", "Alternate name(s)")}
            {f("spouse_prior_names", "Prior name(s)")}
            {f("spouse_dob", "Date of birth")}
            {f("spouse_employer_phone", "Employer phone #")}
            {f("spouse_home_phone", "Home #")}
            {f("spouse_cell", "Cell phone")}
            {f("spouse_work_phone", "Work #")}
            {f("spouse_email", "Personal email")}
            {f("spouse_work_email", "Work email")}
          </div>
        </>
      )}

      <div className="cmpf-section">Sources of Income (annual)</div>
      <table className="cmpf-table resp-table">
        <thead>
          <tr>
            <th>Income type</th>
            <th>Primary party</th>
            {joint && <th>Spouse</th>}
          </tr>
        </thead>
        <tbody>
          {INCOME_ROWS.map((r) => (
            <tr key={r.key}>
              <td data-label="" style={{ fontWeight: 600, verticalAlign: "middle" }}>{r.label}</td>
              <td data-label="Primary party">{moneyCell(`inc_${r.key}_primary`, `${r.label} - primary party`)}</td>
              {joint && <td data-label="Spouse">{moneyCell(`inc_${r.key}_spouse`, `${r.label} - spouse`)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cmpf-section">Spouse / Other Family Income (Monthly)</div>
      <div className="cmp-grid-2">
        {f("spouse_name", "Spouse legal name")}
        {f("spouse_monthly_income", "Spouse monthly income")}
        {f("spouse_employer", "Spouse employer")}
        {f("spouse_employer_how_long", "How long at employer")}
        {f("other_family_income_source", "Other family income (source)")}
        {f("other_family_income_monthly", "Other family monthly income")}
      </div>

      <div className="cmpf-section">Disclosures</div>
      <table className="cmpf-table resp-table">
        <thead>
          <tr>
            <th>Question</th>
            <th>Primary</th>
            {joint && <th>Spouse</th>}
          </tr>
        </thead>
        <tbody>
          {DISCLOSURES.map((q, i) => (
            <tr key={i}>
              <td data-label="" style={{ whiteSpace: "normal", verticalAlign: "middle" }}>{q}</td>
              <td data-label="Primary" style={{ minWidth: 120 }}>{yesNoCell(`disc_${i}_primary`, `${q} - primary`)}</td>
              {joint && <td data-label="Spouse" style={{ minWidth: 120 }}>{yesNoCell(`disc_${i}_spouse`, `${q} - spouse`)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {f("disclosure_details", "Additional disclosure / details")}

      <div className="cmpf-section">Assets &amp; Liabilities</div>
      <div className="cmp-grid-2">
        <div>
          <div className="cmpf-sub" style={{ color: "#0B1F3A" }}>Assets</div>
          {ASSET_ROWS.map((r) => f(r.key, r.label))}
        </div>
        <div>
          <div className="cmpf-sub" style={{ color: "#0B1F3A" }}>Liabilities</div>
          {LIAB_ROWS.map((r) => f(r.key, r.label))}
        </div>
      </div>

      <div className="cmpf-totals" style={{ marginTop: 16 }}>
        <div>Total assets: <strong>{money(totals.assets)}</strong></div>
        <div>Total liabilities: <strong>{money(totals.liabilities)}</strong></div>
        <div style={{ marginTop: 4 }}>Net worth: <strong>{money(totals.net)}</strong></div>
      </div>

      {error && <p className="cmpf-error">{error}</p>}

      <div className="cmpf-actions">
        <button type="button" className="cmpf-primary" disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
