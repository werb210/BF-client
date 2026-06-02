// BF_CLIENT_BLOCK_v301_ACCORD_CMP_FORMS_v1 — Personal Statement of Affairs.
// Boreal-branded build-out, prefilled from the completed application when no
// saved response exists. Storage key remains "personal_net_worth_statement".
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";

type Line = { description?: string; value?: number; lien_holder?: string; balance?: number; payment?: number };
type RealEstateLine = { address?: string; value?: number; mortgage_holder?: string; balance?: number; payment?: number };

type PnwData = {
  full_legal_name?: string; alternate_names?: string; sin?: string; birth_month?: string; birth_day?: string; birth_year?: string;
  marital_status?: "single" | "common_law" | "married" | "divorced" | "separated" | "widowed"; dependants?: string;
  home_phone?: string; work_phone?: string; fax_phone?: string; cell_phone?: string; personal_email?: string; work_email?: string;
  mailing_address?: string; mailing_city?: string; mailing_province?: string; mailing_postal?: string; mailing_duration?: string;
  physical_address?: string; physical_city?: string; physical_province?: string; physical_postal?: string; physical_duration?: string;
  spouse_name?: string; spouse_address?: string; spouse_postal?: string; spouse_phone?: string; spouse_employer?: string; spouse_employer_address?: string; spouse_income?: string; spouse_duration?: string;
  other_income_source?: string; other_income_details?: string; other_income_amount?: string; other_income_duration?: string;
  ref1_name?: string; ref1_address?: string; ref1_relationship?: string; ref1_phone?: string;
  ref2_name?: string; ref2_address?: string; ref2_relationship?: string; ref2_phone?: string;
  ref3_name?: string; ref3_address?: string; ref3_relationship?: string; ref3_phone?: string;
  landlord_name?: string; landlord_phone?: string; landlord_rent?: string;
  disc_prior_dealings?: "yes" | "no"; disc_prior_dealings_details?: string; disc_bankruptcy?: "yes" | "no"; disc_bankruptcy_details?: string;
  disc_criminal?: "yes" | "no"; disc_criminal_details?: string; disc_taxes_satisfied?: "yes" | "no"; disc_taxes_details?: string;
  disc_legal_actions?: "yes" | "no"; disc_legal_actions_details?: string; disc_cosigner?: "yes" | "no"; disc_cosigner_details?: string; details_disclosure?: string;
  cash?: number; rrsp?: number; tfsa?: number; stocks_bonds?: number; accounts_receivable?: number; liquid_other_a?: number; liquid_other_b?: number;
  credit_cards_balance?: number; credit_cards_payment?: number; rrsp_loans_balance?: number; rrsp_loans_payment?: number; other_loans_balance?: number; other_loans_payment?: number;
  stock_margin_balance?: number; stock_margin_payment?: number; loc_balance?: number; loc_payment?: number; taxes_owing_balance?: number; taxes_owing_payment?: number; liab_other_balance?: number; liab_other_payment?: number;
  vehicles?: Line[]; real_estate?: RealEstateLine[]; other_assets?: Line[];
  attest_truth?: boolean; attest_authorization?: boolean; signature_typed_name?: string; signature_date?: string;
};

const EMPTY: PnwData = { vehicles: [{}, {}, {}], real_estate: [{}, {}, {}], other_assets: [{}, {}, {}, {}, {}] };
const inputStyle: CSSProperties = { width: "100%", padding: "6px 8px", fontSize: 13, borderRadius: 4, border: "1px solid #d1d5db", boxSizing: "border-box" };
const labelStyle: CSSProperties = { fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 2, display: "block" };
const sectionStyle: CSSProperties = { marginBottom: 24, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" };
const sectionTitle: CSSProperties = { fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#111827" };
const grid2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const grid3: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };
const grid4: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 };

function num(v: unknown): number { const n = typeof v === "number" ? v : parseFloat(String(v ?? "0")); return Number.isFinite(n) ? n : 0; }
function sum(...xs: unknown[]): number { return xs.reduce<number>((a, b) => a + num(b), 0); }
function money(n: number): string { return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }); }

export default function PersonalNetWorthForm({ applicationId, onComplete, prefill }: { applicationId: string; onComplete: () => void; prefill?: Record<string, unknown> }) {
  const [data, setData] = useState<PnwData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void (async () => {
    try {
      const existing = await getFormResponse(applicationId, "personal_net_worth_statement");
      if (existing) { setData({ ...EMPTY, ...(existing.data as PnwData) }); setSubmitted(!!existing.submitted_at); }
      else if (prefill) setData({ ...EMPTY, ...(prefill as Partial<PnwData>) });
    } catch (err) { setError(err instanceof Error ? err.message : "Load failed"); }
    finally { setLoaded(true); }
  })(); }, [applicationId, prefill]);

  const update = (patch: Partial<PnwData>) => setData((d) => ({ ...d, ...patch }));
  const updateLine = (field: "vehicles" | "real_estate" | "other_assets", idx: number, patch: Record<string, unknown>) => {
    setData((d) => { const arr = [...((d[field] as Array<Record<string, unknown>>) || [])]; arr[idx] = { ...arr[idx], ...patch }; return { ...d, [field]: arr } as PnwData; });
  };
  const autosave = useCallback(async () => { setSaving(true); try { await saveFormResponse(applicationId, "personal_net_worth_statement", data as unknown as Record<string, unknown>); setError(null); } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); } finally { setSaving(false); } }, [applicationId, data]);
  const handleSubmit = async () => {
    if (!data.attest_truth || !data.attest_authorization) { alert("Please confirm both attestations before submitting."); return; }
    if (!data.signature_typed_name?.trim()) { alert("Please type your full legal name as your signature."); return; }
    setSubmitting(true);
    try { await submitFormResponse(applicationId, "personal_net_worth_statement", data as unknown as Record<string, unknown>); setSubmitted(true); onComplete(); }
    catch (err) { setError(err instanceof Error ? err.message : "Submit failed"); }
    finally { setSubmitting(false); }
  };

  if (!loaded) return <div>Loading form…</div>;

  const liquidAssets = sum(data.cash, data.rrsp, data.tfsa, data.stocks_bonds, data.accounts_receivable, data.liquid_other_a, data.liquid_other_b);
  const vehicleAssets = (data.vehicles || []).reduce((a, v) => a + num(v.value), 0);
  const realEstateAssets = (data.real_estate || []).reduce((a, r) => a + num(r.value), 0);
  const otherAssetsTotal = (data.other_assets || []).reduce((a, o) => a + num(o.value), 0);
  const totalAssets = liquidAssets + vehicleAssets + realEstateAssets + otherAssetsTotal;
  const totalLiabilitiesLiquid = sum(data.credit_cards_balance, data.rrsp_loans_balance, data.other_loans_balance, data.stock_margin_balance, data.loc_balance, data.taxes_owing_balance, data.liab_other_balance);
  const vehicleLiens = (data.vehicles || []).reduce((a, v) => a + num(v.balance), 0);
  const mortgages = (data.real_estate || []).reduce((a, r) => a + num(r.balance), 0);
  const otherLiens = (data.other_assets || []).reduce((a, o) => a + num(o.balance), 0);
  const totalLiabilities = totalLiabilitiesLiquid + vehicleLiens + mortgages + otherLiens;
  const netWorth = totalAssets - totalLiabilities;

  const T = (label: string, key: keyof PnwData, type = "text") => <div><label style={labelStyle}>{label}</label><input style={inputStyle} type={type} value={(data[key] as string) || ""} onChange={(e) => update({ [key]: e.target.value } as Partial<PnwData>)} /></div>;
  const N = (label: string, key: keyof PnwData) => <div><label style={labelStyle}>{label}</label><input style={inputStyle} inputMode="decimal" value={(data[key] as number | undefined) ?? ""} onChange={(e) => update({ [key]: e.target.value === "" ? undefined : num(e.target.value) } as Partial<PnwData>)} /></div>;
  const Disclosure = (label: string, key: keyof PnwData, detailsKey: keyof PnwData, yesIsFlag = true) => <div style={{ marginBottom: 12 }}><label style={labelStyle}>{label}</label><div style={{ display: "flex", gap: 16, margin: "4px 0" }}><label style={{ fontSize: 13 }}><input type="radio" checked={data[key] === "yes"} onChange={() => update({ [key]: "yes" } as Partial<PnwData>)} /> Yes</label><label style={{ fontSize: 13 }}><input type="radio" checked={data[key] === "no"} onChange={() => update({ [key]: "no" } as Partial<PnwData>)} /> No</label></div>{data[key] === (yesIsFlag ? "yes" : "no") && <input style={inputStyle} placeholder="Please provide details" value={(data[detailsKey] as string) || ""} onChange={(e) => update({ [detailsKey]: e.target.value } as Partial<PnwData>)} />}</div>;

  return <div onBlur={() => void autosave()}>
    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Personal Statement of Affairs</h2>
    <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>{saving ? "Saving…" : "Saved"}{error ? ` — ${error}` : ""}{submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Submitted</span>}</p>

    <div style={sectionStyle}><div style={sectionTitle}>Personal Information</div><div style={grid2}>{T("Full Legal Name", "full_legal_name")}{T("Alternate Name(s)", "alternate_names")}{T("Social Insurance Number", "sin")}{T("Dependants", "dependants")}</div><div style={{ ...grid3, marginTop: 12 }}>{T("Birth Month", "birth_month")}{T("Birth Day", "birth_day")}{T("Birth Year", "birth_year")}</div><div style={{ ...grid4, marginTop: 12 }}>{T("Home Phone", "home_phone", "tel")}{T("Work Phone", "work_phone", "tel")}{T("Cell Phone", "cell_phone", "tel")}{T("Fax Phone", "fax_phone", "tel")}</div><div style={{ ...grid2, marginTop: 12 }}>{T("Personal Email", "personal_email", "email")}{T("Work Email", "work_email", "email")}</div><div style={{ marginTop: 12 }}><label style={labelStyle}>Marital Status</label><select style={inputStyle} value={data.marital_status || ""} onChange={(e) => update({ marital_status: (e.target.value || undefined) as PnwData["marital_status"] })}><option value="">Select…</option><option value="single">Single</option><option value="common_law">Common-Law</option><option value="widowed">Widowed</option><option value="married">Married</option><option value="divorced">Divorced</option><option value="separated">Separated</option></select></div></div>
    <div style={sectionStyle}><div style={sectionTitle}>Address</div><div style={grid4}>{T("Present Address (mailing)", "mailing_address")}{T("City", "mailing_city")}{T("Province", "mailing_province")}{T("Postal Code", "mailing_postal")}</div><div style={{ marginTop: 12 }}>{T("How long at mailing address?", "mailing_duration")}</div><div style={{ ...grid4, marginTop: 12 }}>{T("Present Address (physical)", "physical_address")}{T("City", "physical_city")}{T("Province", "physical_province")}{T("Postal Code", "physical_postal")}</div><div style={{ marginTop: 12 }}>{T("How long at physical address?", "physical_duration")}</div></div>
    <div style={sectionStyle}><div style={sectionTitle}>Spouse &amp; Other Income</div><div style={grid4}>{T("Spouse Legal Name", "spouse_name")}{T("Spouse Address", "spouse_address")}{T("Postal Code", "spouse_postal")}{T("Spouse Cell Phone", "spouse_phone", "tel")}</div><div style={{ ...grid4, marginTop: 12 }}>{T("Spouse Employer", "spouse_employer")}{T("Employer Address", "spouse_employer_address")}{T("Monthly Income", "spouse_income")}{T("How Long?", "spouse_duration")}</div><div style={{ ...grid4, marginTop: 12 }}>{T("Other Family Income (source)", "other_income_source")}{T("Details", "other_income_details")}{T("Monthly Income", "other_income_amount")}{T("How Long?", "other_income_duration")}</div></div>
    <div style={sectionStyle}><div style={sectionTitle}>Personal References</div>{[1, 2, 3].map((n) => <div key={n} style={{ ...grid4, marginBottom: 12 }}>{T(`Reference #${n} Name`, `ref${n}_name` as keyof PnwData)}{T("Address", `ref${n}_address` as keyof PnwData)}{T("Relationship", `ref${n}_relationship` as keyof PnwData)}{T("Phone #", `ref${n}_phone` as keyof PnwData, "tel")}</div>)}<div style={grid3}>{T("Business Landlord (if renting)", "landlord_name")}{T("Landlord Phone #", "landlord_phone", "tel")}{T("Monthly Rent Payment", "landlord_rent")}</div></div>
    <div style={sectionStyle}><div style={sectionTitle}>Disclosures</div>{Disclosure("Have you had any previous dealings with Boreal Financial (any division or subsidiary)?", "disc_prior_dealings", "disc_prior_dealings_details")}{Disclosure("Have you ever filed for bankruptcy (either discharged or not)?", "disc_bankruptcy", "disc_bankruptcy_details")}{Disclosure("Have you ever been convicted of a criminal offence that you have not been pardoned for?", "disc_criminal", "disc_criminal_details")}{Disclosure("Are your income taxes for the previous year(s) fully satisfied? (details required if No)", "disc_taxes_satisfied", "disc_taxes_details", false)}{Disclosure("Are there any legal actions, including pending or looming actions or judgments, against you?", "disc_legal_actions", "disc_legal_actions_details")}{Disclosure("Are you a co-signor or obligator to any other parties' debts?", "disc_cosigner", "disc_cosigner_details")}<label style={labelStyle}>Additional details / disclosure</label><textarea style={{ ...inputStyle, minHeight: 80 }} value={data.details_disclosure || ""} onChange={(e) => update({ details_disclosure: e.target.value })} /></div>
    <div style={sectionStyle}><div style={sectionTitle}>Liquid Assets &amp; Liabilities</div><div style={grid4}>{N("Cash", "cash")}{N("RRSP", "rrsp")}{N("TFSA", "tfsa")}{N("Stocks / Bonds", "stocks_bonds")}{N("Accounts Receivable", "accounts_receivable")}{N("Other (liquid)", "liquid_other_a")}{N("Other (liquid)", "liquid_other_b")}</div><div style={{ ...grid4, marginTop: 12 }}>{N("Credit Cards — balance", "credit_cards_balance")}{N("RRSP Loans — balance", "rrsp_loans_balance")}{N("Other Loans — balance", "other_loans_balance")}{N("Stock Margin — balance", "stock_margin_balance")}{N("Line of Credit — balance", "loc_balance")}{N("Taxes Owing / CRA Debt — balance", "taxes_owing_balance")}{N("Other liability — balance", "liab_other_balance")}</div></div>
    {([ ["Vehicle Assets", "vehicles", "Description", "Lien Holder"], ["Real Estate Assets", "real_estate", "Address", "Mortgage Holder"], ["Other Assets", "other_assets", "Description", "Lien Holder"] ] as const).map(([title, field, descLabel, holderLabel]) => <div key={field} style={sectionStyle}><div style={sectionTitle}>{title}</div>{((data[field] as Array<Record<string, unknown>>) || []).map((row, idx) => <div key={idx} style={{ ...grid4, marginBottom: 8 }}><div><label style={labelStyle}>{descLabel}</label><input style={inputStyle} value={(row[field === "real_estate" ? "address" : "description"] as string) || ""} onChange={(e) => updateLine(field, idx, { [field === "real_estate" ? "address" : "description"]: e.target.value })} /></div><div><label style={labelStyle}>Value</label><input style={inputStyle} inputMode="decimal" value={(row.value as number | undefined) ?? ""} onChange={(e) => updateLine(field, idx, { value: e.target.value === "" ? undefined : num(e.target.value) })} /></div><div><label style={labelStyle}>{holderLabel}</label><input style={inputStyle} value={(row[field === "real_estate" ? "mortgage_holder" : "lien_holder"] as string) || ""} onChange={(e) => updateLine(field, idx, { [field === "real_estate" ? "mortgage_holder" : "lien_holder"]: e.target.value })} /></div><div><label style={labelStyle}>Balance</label><input style={inputStyle} inputMode="decimal" value={(row.balance as number | undefined) ?? ""} onChange={(e) => updateLine(field, idx, { balance: e.target.value === "" ? undefined : num(e.target.value) })} /></div></div>)}</div>)}
    <div style={{ ...sectionStyle, background: "#f8fafc" }}><div style={grid3}><div><label style={labelStyle}>Total Assets</label><div style={{ fontWeight: 700 }}>{money(totalAssets)}</div></div><div><label style={labelStyle}>Total Liabilities</label><div style={{ fontWeight: 700 }}>{money(totalLiabilities)}</div></div><div><label style={labelStyle}>Net Worth</label><div style={{ fontWeight: 700, color: netWorth >= 0 ? "#065f46" : "#991b1b" }}>{money(netWorth)}</div></div></div></div>
    <div style={sectionStyle}><div style={sectionTitle}>Authorization</div><p style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>The undersigned authorizes Boreal Financial and its representatives, at any time and on an ongoing basis, to obtain, verify, use, communicate with and disclose to third parties any credit, financial and personal information that Boreal Financial deems necessary to complete, service or enforce any facility or transaction. The undersigned confirms that the information provided is true and complete.</p><label style={{ display: "block", fontSize: 13, marginTop: 12 }}><input type="checkbox" checked={!!data.attest_truth} onChange={(e) => update({ attest_truth: e.target.checked })} /> I confirm the above information is true and correct.</label><label style={{ display: "block", fontSize: 13, marginTop: 8 }}><input type="checkbox" checked={!!data.attest_authorization} onChange={(e) => update({ attest_authorization: e.target.checked })} /> I authorize Boreal Financial as described above.</label><div style={{ ...grid2, marginTop: 12 }}>{T("Signature (type your full legal name)", "signature_typed_name")}{T("Date", "signature_date", "date")}</div></div>
    <button type="button" disabled={submitting} onClick={() => void handleSubmit()} style={{ padding: "12px 24px", background: "#0b1320", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600, opacity: submitting ? 0.6 : 1 }}>{submitting ? "Submitting…" : "Submit Statement"}</button>
  </div>;
}
