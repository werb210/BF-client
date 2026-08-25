// BF_CLIENT_SBA_413_v198 — SBA Form 413, Personal Financial Statement.
//
// Deliberately NOT in the wizard. SBA's own burden estimate is 90 minutes, and it
// has to be completed by every owner of 20% or more plus every guarantor. Asking
// for it before a lender is engaged would end the application; asking for it in
// the portal, once someone is invested, is the difference between a form and a
// wall.
//
// Structurally this is PersonalNetWorthForm with a US row set. That form is built
// to Accord's 2024 Canadian statement - RRSP, TFSA, SIN, CRA debt - which does not
// map onto 413. Rather than fork the component and inherit its Canadian labels,
// this is its own file with 413's own lines, including the two sections the
// Canadian form has no equivalent for: contingent liabilities and life insurance
// cash surrender value.
import { useEffect, useMemo, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";

// BF_CLIENT_SBA_413_PER_OWNER_v200
// SBA requires one Form 413 per owner of 20% or more, plus each guarantor - it
// is a personal balance sheet, not a company one. application_form_responses is
// UNIQUE (application_id, doc_type), so a single "sba_form_413" key meant a
// second owner's submission OVERWROTE the first, and a two-owner deal would
// reach the lender with owner 1's assets on both statements.
//
// Owner 1 keeps the unsuffixed key so existing submissions are not orphaned;
// owner 2 onward get sba_form_413_owner_N. The server already reads both shapes
// (see loadSbaContext in sbaOwners.ts v95).
function formKeyFor(ownerIndex: number): string {
  return ownerIndex <= 1 ? "sba_form_413" : `sba_form_413_owner_${ownerIndex}`;
}

type Data = Record<string, string>;

const ASSET_ROWS: Array<{ key: string; label: string }> = [
  { key: "asset_cash", label: "Cash on hand and in banks" },
  { key: "asset_savings", label: "Savings accounts" },
  { key: "asset_ira", label: "IRA or other retirement account" },
  { key: "asset_ar", label: "Accounts and notes receivable" },
  { key: "asset_life_insurance", label: "Life insurance - cash surrender value only" },
  { key: "asset_stocks_bonds", label: "Stocks and bonds" },
  { key: "asset_real_estate", label: "Real estate" },
  { key: "asset_automobiles", label: "Automobiles" },
  { key: "asset_other_personal", label: "Other personal property" },
  { key: "asset_other", label: "Other assets" },
];

const LIAB_ROWS: Array<{ key: string; label: string }> = [
  { key: "liab_accounts_payable", label: "Accounts payable" },
  { key: "liab_notes_payable", label: "Notes payable to banks and others" },
  { key: "liab_installment_auto", label: "Installment account (auto)" },
  { key: "liab_installment_auto_monthly", label: "  - monthly payment" },
  { key: "liab_installment_other", label: "Installment account (other)" },
  { key: "liab_installment_other_monthly", label: "  - monthly payment" },
  { key: "liab_life_insurance_loans", label: "Loans against life insurance" },
  { key: "liab_mortgages", label: "Mortgages on real estate" },
  { key: "liab_unpaid_taxes", label: "Unpaid taxes" },
  { key: "liab_other", label: "Other liabilities" },
];

const INCOME_ROWS: Array<{ key: string; label: string }> = [
  { key: "income_salary", label: "Salary" },
  { key: "income_net_investment", label: "Net investment income" },
  { key: "income_real_estate", label: "Real estate income" },
  { key: "income_other", label: "Other income" },
];

// 413 keeps these off the balance sheet but SBA reads them closely: a personal
// guarantee on someone else's note is exactly the exposure they are looking for.
const CONTINGENT_ROWS: Array<{ key: string; label: string }> = [
  { key: "cont_endorser", label: "As endorser or co-maker" },
  { key: "cont_legal_claims", label: "Legal claims and judgments" },
  { key: "cont_federal_tax", label: "Provision for federal income tax" },
  { key: "cont_other_special", label: "Other special debt" },
];

// The monthly-payment rows sit under their parent for readability but are not
// balances, so they must not be added into the liability total.
const NON_BALANCE_KEYS = new Set([
  "liab_installment_auto_monthly",
  "liab_installment_other_monthly",
]);

const money = (v: string): number => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Sba413Form({
  applicationId,
  onComplete,
  ownerIndex = 1,
  ownerName = "",
}: { applicationId: string; onComplete: () => void; ownerIndex?: number; ownerName?: string }) {
  // BF_CLIENT_SBA_413_PER_OWNER_v200
  const FORM_KEY = formKeyFor(ownerIndex);
  const [data, setData] = useState<Data>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        const fields = (existing as any)?.data?.fields ?? (existing as any)?.fields;
        if (!cancelled && fields && typeof fields === "object") setData(fields as Data);
      } catch {
        // No saved response yet is the normal first-open case, not an error.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [applicationId]);

  const set = (key: string, value: string) => setData((d) => ({ ...d, [key]: value }));
  const persist = () => {
    void saveFormResponse(applicationId, FORM_KEY, { fields: data }).catch(() => {});
  };

  const totals = useMemo(() => {
    const assets = ASSET_ROWS.reduce((sum, r) => sum + money(data[r.key]), 0);
    const liabilities = LIAB_ROWS
      .filter((r) => !NON_BALANCE_KEYS.has(r.key))
      .reduce((sum, r) => sum + money(data[r.key]), 0);
    return { assets, liabilities, netWorth: assets - liabilities };
  }, [data]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await submitFormResponse(applicationId, FORM_KEY, { fields: data, totals });
      setSubmitted(true);
    } catch {
      setError("We could not save that. Please try again, or call us on (825) 451-1768.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "#51617D" }}>Loading&hellip;</p>;

  const row = (r: { key: string; label: string }) => (
    <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
      <label style={{ flex: 1, fontSize: 14, color: "#51617D" }}>{r.label}</label>
      <input
        inputMode="decimal"
        value={data[r.key] ?? ""}
        onChange={(e) => set(r.key, e.target.value)}
        onBlur={persist}
        placeholder="$0"
        style={{ width: 140, padding: "6px 8px", border: "1px solid #E4EAF2", borderRadius: 6, textAlign: "right" }}
      />
    </div>
  );

  const section = (title: string, rows: Array<{ key: string; label: string }>) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, color: "#0B1F3A", marginBottom: 6 }}>{title}</div>
      {rows.map(row)}
    </div>
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <h3 style={{ marginTop: 0, color: "#0B1F3A" }}>
        Personal Financial Statement (SBA Form 413)
        {ownerName ? <span style={{ fontWeight: 400, color: "#51617D" }}> — {ownerName}</span> : null}
      </h3>
      <p style={{ color: "#51617D", fontSize: 14 }}>
        SBA requires this from every owner of 20% or more and from anyone guaranteeing
        the loan. Figures should be current within 120 days. Divide jointly owned
        assets and liabilities as appropriate. Your answers save as you go, so you can
        stop and come back.
      </p>

      {section("Assets", ASSET_ROWS)}
      {section("Liabilities", LIAB_ROWS)}

      <div style={{ background: "#F5F8FC", borderRadius: 8, padding: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total assets</span><strong>{fmt(totals.assets)}</strong></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total liabilities</span><strong>{fmt(totals.liabilities)}</strong></div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E4EAF2", marginTop: 6, paddingTop: 6 }}>
          <span>Net worth</span><strong>{fmt(totals.netWorth)}</strong>
        </div>
      </div>

      {section("Source of income (annual)", INCOME_ROWS)}
      {section("Contingent liabilities", CONTINGENT_ROWS)}

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, color: "#0B1F3A", marginBottom: 6 }}>Notes</div>
        <textarea
          value={data.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          onBlur={persist}
          rows={4}
          placeholder="Unpaid taxes, other liabilities, life insurance held, or anything a lender should see alongside the numbers above."
          style={{ width: "100%", padding: 8, border: "1px solid #E4EAF2", borderRadius: 6 }}
        />
      </div>

      {error ? <p style={{ color: "#B42318", fontSize: 14 }}>{error}</p> : null}
      {submitted ? <p style={{ color: "#067647", fontSize: 14 }}>Saved. You can reopen this any time to update it.</p> : null}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" onClick={handleSubmit} disabled={saving}
          style={{ padding: "8px 16px", border: 0, borderRadius: 8, background: "#BF9B49", color: "#0B1F3A", fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
          {saving ? "Saving..." : "Submit"}
        </button>
        <button type="button" onClick={() => onComplete()}
          style={{ padding: "8px 16px", border: "1px solid #E4EAF2", borderRadius: 8, background: "#fff", color: "#0B1F3A", fontWeight: 600, cursor: "pointer" }}>
          Done
        </button>
      </div>
    </div>
  );
}
