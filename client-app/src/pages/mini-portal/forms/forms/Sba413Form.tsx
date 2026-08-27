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

type Data = Record<string, any>;

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

  // BF_CLIENT_SBA_413_SCHEDULES_v215
  const amount = (key: string) => Number(String(data[key] ?? "").replace(/[^0-9.-]/g, "")) || 0;

  const setRow = (listKey: string, index: number, field: string, value: string) => {
    const list = Array.isArray(data[listKey]) ? [...(data[listKey] as any[])] : [];
    list[index] = { ...(list[index] ?? {}), [field]: value };
    set(listKey, list as any);
  };
  const addRow = (listKey: string, max: number) => {
    const list = Array.isArray(data[listKey]) ? [...(data[listKey] as any[])] : [];
    if (list.length >= max) return;
    list.push({});
    set(listKey, list as any);
  };
  const removeRow = (listKey: string, index: number) => {
    const list = Array.isArray(data[listKey]) ? [...(data[listKey] as any[])] : [];
    list.splice(index, 1);
    set(listKey, list as any);
  };
  const cell = (listKey: string, index: number, field: string, placeholder: string) => (
    <input value={String((data[listKey] as any[])?.[index]?.[field] ?? "")}
      onChange={(e) => setRow(listKey, index, field, e.target.value)} onBlur={persist}
      placeholder={placeholder} style={{ padding: "6px 8px", border: "1px solid #E4EAF2", borderRadius: 6, width: "100%" }} />
  );
  const table = (listKey: string, title: string, hint: string, max: number,
    columns: Array<{ field: string; label: string; placeholder: string }>) => {
    const list = Array.isArray(data[listKey]) ? (data[listKey] as any[]) : [];
    return <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, color: "#0B1F3A", marginBottom: 2 }}>{title}</div>
      <div style={{ color: "#51617D", fontSize: 13, marginBottom: 8 }}>{hint}</div>
      {list.map((_, index) => <div key={index} style={{ border: "1px solid #E4EAF2", borderRadius: 8, padding: 12, marginBottom: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {columns.map((c) => <div key={c.field} style={{ gridColumn: c.field === columns[0].field ? "1 / -1" : undefined }}>
          <label style={{ display: "block", fontSize: 12, color: "#51617D", marginBottom: 4 }}>{c.label}</label>
          {cell(listKey, index, c.field, c.placeholder)}
        </div>)}
        <div style={{ gridColumn: "1 / -1" }}><button type="button" onClick={() => removeRow(listKey, index)}
          style={{ background: "transparent", border: "1px solid #E4EAF2", borderRadius: 6, padding: "4px 10px", color: "#b91c1c", cursor: "pointer", fontSize: 13 }}>Remove</button></div>
      </div>)}
      {list.length < max ? <button type="button" onClick={() => addRow(listKey, max)}
        style={{ background: "#0B1F3A", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>
        Add {list.length === 0 ? "an entry" : "another"}</button> :
        <div style={{ color: "#51617D", fontSize: 13 }}>The form holds {max}. If you have more, tell us in Notes and we will attach a continuation sheet.</div>}
    </div>;
  };
  const textSchedule = (key: string, title: string, hint: string) => <div style={{ marginBottom: 20 }}>
    <div style={{ fontWeight: 600, color: "#0B1F3A", marginBottom: 2 }}>{title}</div>
    <div style={{ color: "#51617D", fontSize: 13, marginBottom: 8 }}>{hint}</div>
    <textarea value={String(data[key] ?? "")} onChange={(e) => set(key, e.target.value)} onBlur={persist} rows={3}
      style={{ width: "100%", padding: "8px", border: "1px solid #E4EAF2", borderRadius: 6, resize: "vertical", fontFamily: "inherit" }} />
  </div>;

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

      {amount("liab_notes_payable") > 0 && table("noteholders", "Section 2 - Notes payable to banks and others",
        "You reported notes payable above. SBA needs each lender listed.", 5, [
          { field: "name", label: "Name and address of noteholder", placeholder: "Lender name, street, city, state" },
          { field: "original_balance", label: "Original balance", placeholder: "$0" },
          { field: "current_balance", label: "Current balance", placeholder: "$0" },
          { field: "payment", label: "Payment amount", placeholder: "$0" },
          { field: "frequency", label: "Frequency", placeholder: "Monthly" },
          { field: "collateral", label: "How secured or endorsed - type of collateral", placeholder: "e.g. Vehicle, unsecured" },
        ])}
      {/* BF_CLIENT_SBA413_SECTIONS_v129 - Section 3 had no UI. Four rows is what
          the paper form holds; beyond that SBA wants a continuation sheet. */}
      {amount("asset_stocks_bonds") > 0 && table("securities", "Section 3 - Stocks and bonds",
        "You reported stocks and bonds above. SBA needs each holding listed.", 4, [
          { field: "name", label: "Name of security", placeholder: "e.g. Royal Bank of Canada common" },
          { field: "shares", label: "Number of shares", placeholder: "100" },
          { field: "cost", label: "Cost", placeholder: "$0" },
          { field: "market_value", label: "Market value per share", placeholder: "$0" },
          { field: "quote_date", label: "Date of quotation", placeholder: "YYYY-MM-DD" },
          { field: "total_value", label: "Total value", placeholder: "$0" },
        ])}
      {amount("asset_real_estate") > 0 && table("properties", "Section 4 - Real estate owned",
        "You reported real estate above. List each property.", 3, [
          { field: "address", label: "Property address", placeholder: "Street, city, state, ZIP" },
          { field: "type", label: "Type of real estate", placeholder: "Primary residence, rental, land" },
          { field: "date_purchased", label: "Date purchased", placeholder: "YYYY-MM-DD" },
          { field: "original_cost", label: "Original cost", placeholder: "$0" },
          { field: "market_value", label: "Present market value", placeholder: "$0" },
          { field: "mortgage_holder", label: "Name and address of mortgage holder", placeholder: "Lender name, street, city" },
          { field: "mortgage_account", label: "Mortgage account number", placeholder: "Account number" },
          { field: "mortgage_balance", label: "Mortgage balance", placeholder: "$0" },
          { field: "payment", label: "Payment per month or year", placeholder: "$0 monthly" },
          { field: "mortgage_status", label: "Status of mortgage", placeholder: "Current, or explain" },
        ])}
      {amount("asset_other_personal") > 0 && textSchedule("section5_other_property", "Section 5 - Other personal property and other assets",
        "Describe each item. If any is pledged as security, give the lien holder's name and address, the amount, the payment terms, and say if it is delinquent.")}
      {amount("liab_unpaid_taxes") > 0 && textSchedule("section6_unpaid_taxes", "Section 6 - Unpaid taxes",
        "Type of tax, who it is payable to, when it fell due, the amount, and any property a lien attaches to.")}
      {amount("asset_life_insurance") > 0 && textSchedule("section8_life_insurance", "Section 8 - Life insurance held",
        "Face amount and cash surrender value of each policy, the insurance company, and the beneficiaries.")}
      {section("Source of income (annual)", INCOME_ROWS)}
      {amount("income_other") > 0 && textSchedule("other_income_description", "Description of other income",
        "Alimony or child support need not be disclosed unless you want it counted toward total income.")}
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
