// BF_CLIENT_SBA_1919_v199 — SBA Form 1919, the questions Step 3 does not ask.
import { useEffect, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";

const FORM_KEY = "sba_form_1919";

const QUESTIONS: Array<{ key: string; text: string }> = [
  { key: "q1_debarred", text: "Is the applicant, or any associate, presently suspended, debarred, proposed for debarment, declared ineligible, voluntarily excluded from participation in a transaction by any Federal department or agency, or presently involved in any bankruptcy?" },
  { key: "q2_federal_default", text: "Is the applicant, any associate, or any business owned by them or any affiliates currently delinquent, or have they ever defaulted, on a direct or guaranteed loan from SBA or another Federal agency loan program - or been a guarantor on such a loan?" },
  { key: "q3_other_business", text: "Is the applicant, or any owner of the applicant, an owner of any other business?" },
  { key: "q5_exports", text: "Are any of the applicant's products or services exported, directly or indirectly, or is there a plan to begin exporting as a result of this loan?" },
  { key: "q6_broker_fee", text: "Has the applicant paid or committed to pay a fee to the lender or a third party to assist in preparing the loan application, or to a referral agent or broker?" },
  { key: "q7_restricted_revenue", text: "Are any of the applicant's revenues derived from gambling, loan packaging, lending activities, lobbying activities, or from products, services or performances of a prurient sexual nature?" },
  { key: "q8_sba_employee", text: "Is any sole proprietor, partner, officer, director or 10%+ stockholder an SBA employee, or a household member of one?" },
  { key: "q9_former_sba", text: "Is any employee, owner, partner, attorney, agent, stockholder, officer, director, creditor or debtor of the applicant a former SBA employee separated from SBA less than one year ago?" },
  { key: "q10_congress", text: "Is any sole proprietor, general partner, officer, director or 10%+ stockholder, or a household member of such an individual, a member of Congress or an appointed official or employee of the legislative or judicial branch?" },
  { key: "q11_federal_employee", text: "Is any sole proprietor, general partner, officer, director or 10%+ stockholder, or a household member, a Federal Government employee or a member of the military at GS-13 or higher (or military equivalent)?" },
  { key: "q12_advisory_council", text: "Is any sole proprietor, general partner, officer, director or 10%+ stockholder, or a household member, a member or employee of a Small Business Advisory Council, or a SCORE volunteer?" },
  { key: "q13_legal_action", text: "Is the applicant, any owner, or any business owned by them presently involved in any legal action, including divorce?" },
];

const PURPOSES: Array<{ key: string; label: string }> = [
  { key: "purpose_equipment", label: "Acquisition or installation of equipment" },
  { key: "purpose_real_estate", label: "Purchase or construction of commercial real estate" },
  { key: "purpose_working_capital", label: "Working capital" },
  { key: "purpose_inventory", label: "Acquisition of inventory" },
  { key: "purpose_acquisition", label: "Business acquisition (change of ownership)" },
  { key: "purpose_debt_refi", label: "Debt refinancing" },
  { key: "purpose_other", label: "Other" },
];

const money = (v: string): number => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default function Sba1919Form({ applicationId, onComplete }: { applicationId: string; onComplete: () => void }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        const fields = (existing as any)?.data?.fields ?? (existing as any)?.fields;
        if (!cancelled && fields && typeof fields === "object") setData(fields);
      } catch { /* first open */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [applicationId]);

  const set = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const persist = () => { void saveFormResponse(applicationId, FORM_KEY, { fields: data }).catch(() => {}); };

  async function handleSubmit() {
    setSaving(true); setError(null);
    try {
      await submitFormResponse(applicationId, FORM_KEY, { fields: data });
      setDone(true);
    } catch {
      setError("We could not save that. Please try again, or call us on (825) 451-1768.");
    } finally { setSaving(false); }
  }

  if (loading) return <p style={{ color: "#51617D" }}>Loading&hellip;</p>;
  const purposeTotal = PURPOSES.reduce((sum, p) => sum + money(data[p.key]), 0);

  return (
    <div style={{ maxWidth: 760 }}>
      <h3 style={{ marginTop: 0, color: "#0B1F3A" }}>SBA Borrower Information (Form 1919)</h3>
      <p style={{ color: "#51617D", fontSize: 14 }}>A yes to any of these does not stop the loan - SBA asks for the detail in an attachment, and we will handle that with you. Answers save as you go.</p>
      <div style={{ fontWeight: 600, color: "#0B1F3A", margin: "16px 0 8px" }}>Jobs</div>
      {[{ key: "fte_retained", label: "FTE jobs saved or retained because of this loan (including owners)" }, { key: "fte_created", label: "New FTE jobs created because of this loan (including owners)" }].map((f) => (
        <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
          <label style={{ flex: 1, fontSize: 14, color: "#51617D" }}>{f.label}</label>
          <input type="number" min="0" value={data[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} onBlur={persist} style={{ width: 120, padding: "6px 8px", border: "1px solid #E4EAF2", borderRadius: 6, textAlign: "right" }} />
        </div>
      ))}
      <div style={{ fontWeight: 600, color: "#0B1F3A", margin: "20px 0 8px" }}>What the loan is for</div>
      {PURPOSES.map((p) => (
        <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
          <label style={{ flex: 1, fontSize: 14, color: "#51617D" }}>{p.label}</label>
          <input inputMode="decimal" placeholder="$0" value={data[p.key] ?? ""} onChange={(e) => set(p.key, e.target.value)} onBlur={persist} style={{ width: 140, padding: "6px 8px", border: "1px solid #E4EAF2", borderRadius: 6, textAlign: "right" }} />
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", background: "#F5F8FC", borderRadius: 8, padding: 10, marginTop: 8 }}><span style={{ fontSize: 14 }}>Total</span><strong>{purposeTotal.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</strong></div>
      <div style={{ fontWeight: 600, color: "#0B1F3A", margin: "20px 0 8px" }}>Eligibility questions</div>
      {QUESTIONS.map((q) => (
        <div key={q.key} style={{ padding: "10px 0", borderBottom: "1px solid #E4EAF2" }}>
          <div style={{ fontSize: 14, color: "#0B1F3A", marginBottom: 6 }}>{q.text}</div>
          <div style={{ display: "flex", gap: 16 }}>{["No", "Yes"].map((opt) => (
            <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#51617D" }}><input type="radio" name={q.key} value={opt.toLowerCase()} checked={data[q.key] === opt.toLowerCase()} onChange={(e) => { set(q.key, e.target.value); persist(); }} />{opt}</label>
          ))}</div>
          {/* BF_CLIENT_EXPORT_SALES_v131 - question 5 has two named sub-parts on
              the form. 5.a is a dollar amount and 5.b is a country list; the
              generic detail box could only carry one of them. */}
          {data[q.key] === "yes" && q.key === "q5_exports" && (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "block", fontSize: 13, color: "#51617D", marginBottom: 4 }}>
                5.a Estimated total export sales this loan will support
              </label>
              <input inputMode="decimal" placeholder="$0"
                value={data.q5_export_sales ?? ""}
                onChange={(e) => set("q5_export_sales", e.target.value)} onBlur={persist}
                style={{ width: "100%", padding: 8, border: "1px solid #E4EAF2", borderRadius: 6 }} />
              <label style={{ display: "block", fontSize: 13, color: "#51617D", margin: "10px 0 4px" }}>
                5.b Principal countries of export - list at least one
              </label>
              <input placeholder="United States, Mexico"
                value={data.q5_exports_detail ?? ""}
                onChange={(e) => set("q5_exports_detail", e.target.value)} onBlur={persist}
                style={{ width: "100%", padding: 8, border: "1px solid #E4EAF2", borderRadius: 6 }} />
              <div style={{ fontSize: 12, color: "#51617D", marginTop: 4 }}>
                Separate countries with commas. The form has room for three.
              </div>
            </div>
          )}
          {data[q.key] === "yes" && q.key !== "q5_exports" && <textarea rows={2} placeholder="Please give us the detail - SBA needs it as an attachment." value={data[`${q.key}_detail`] ?? ""} onChange={(e) => set(`${q.key}_detail`, e.target.value)} onBlur={persist} style={{ width: "100%", marginTop: 6, padding: 8, border: "1px solid #E4EAF2", borderRadius: 6 }} />}
        </div>
      ))}
      {error ? <p style={{ color: "#B42318", fontSize: 14 }}>{error}</p> : null}
      {done ? <p style={{ color: "#067647", fontSize: 14 }}>Saved. Reopen any time to change an answer.</p> : null}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button type="button" onClick={handleSubmit} disabled={saving} style={{ padding: "8px 16px", border: 0, borderRadius: 8, background: "#BF9B49", color: "#0B1F3A", fontWeight: 600, cursor: saving ? "default" : "pointer" }}>{saving ? "Saving..." : "Submit"}</button>
        <button type="button" onClick={() => onComplete()} style={{ padding: "8px 16px", border: "1px solid #E4EAF2", borderRadius: 8, background: "#fff", color: "#0B1F3A", fontWeight: 600, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );
}
