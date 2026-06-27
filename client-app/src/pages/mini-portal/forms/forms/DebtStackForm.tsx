// BF_CLIENT_BLOCK_v307_DEBT_EQUIP_PREFILL_v1 — Debt Stack (existing-debt schedule).
// First-draft debt schedule: each row is an existing facility/obligation the
// business owes. Client name prefilled from application data.
// Persists via the generic form-responses endpoint, key "debt_stack".
import { useEffect, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";

const FORM_KEY = "debt_stack";

type DebtRow = {
  lender: string;
  facility_type: string;
  original_amount: string;
  balance: string;
  monthly_payment: string;
  rate: string;
  maturity: string;
  secured_by: string;
};
type DebtData = { client_name: string; rows: DebtRow[]; notes: string };

const emptyRow = (): DebtRow => ({
  lender: "", facility_type: "", original_amount: "", balance: "",
  monthly_payment: "", rate: "", maturity: "", secured_by: "",
});
const emptyData = (): DebtData => ({ client_name: "", rows: [emptyRow(), emptyRow()], notes: "" });

const num = (v: string) => {
  const n = parseFloat((v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const lbl = { display: "block", fontSize: 11, fontWeight: 600, color: "#374151", margin: "6px 0 2px" } as const;
const inp = { width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5, boxSizing: "border-box" as const } as const;
const th = { textAlign: "left" as const, padding: "6px 6px", fontSize: 10, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" as const } as const;
const td = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" as const } as const;

export default function DebtStackForm({
  applicationId,
  prefill,
  onComplete,
}: { applicationId: string; prefill?: Record<string, unknown>; onComplete: () => void }) {
  const [data, setData] = useState<DebtData>(emptyData());
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const preName = String((prefill?.businessName ?? prefill?.fullName ?? "") || "");
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        if (existing?.data) {
          const d = existing.data as Partial<DebtData>;
          setData({
            client_name: d.client_name || preName,
            rows: Array.isArray(d.rows) && d.rows.length ? d.rows.map((r) => ({ ...emptyRow(), ...r })) : emptyData().rows,
            notes: d.notes || "",
          });
          setSubmitted(!!existing.submitted_at);
          setLoaded(true);
          return;
        }
      } catch {
        // first open
      }
      setData((d) => ({ ...d, client_name: preName }));
      setLoaded(true);
    })();
  }, [applicationId, prefill]);

  const persist = (next: DebtData) => { void saveFormResponse(applicationId, FORM_KEY, next as unknown as Record<string, unknown>).catch(() => {}); };
  const setRow = (i: number, patch: Partial<DebtRow>) =>
    setData((d) => ({ ...d, rows: d.rows.map((r, idx): DebtRow => (idx === i ? { ...r, ...patch } : r)) }));
  const addRow = () => setData((d) => ({ ...d, rows: [...d.rows, emptyRow()] }));
  const removeRow = (i: number) => setData((d) => ({ ...d, rows: d.rows.length > 1 ? d.rows.filter((_, idx) => idx !== i) : d.rows }));

  const totals = {
    balance: data.rows.reduce((s, r) => s + num(r.balance), 0),
    monthly: data.rows.reduce((s, r) => s + num(r.monthly_payment), 0),
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitFormResponse(applicationId, FORM_KEY, { ...data, totals, submitted_at: new Date().toISOString() });
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) return <div>Loading…</div>;

  const cols: Array<{ key: keyof DebtRow; label: string }> = [
    { key: "lender", label: "Lender / creditor" },
    { key: "facility_type", label: "Facility type" },
    { key: "original_amount", label: "Original amount" },
    { key: "balance", label: "Current balance" },
    { key: "monthly_payment", label: "Monthly payment" },
    { key: "rate", label: "Rate %" },
    { key: "maturity", label: "Maturity" },
    { key: "secured_by", label: "Secured by" },
  ];

  return (
    <div onBlur={() => persist(data)}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Debt Schedule</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
        List the business's existing debts and obligations (term loans, lines of credit, leases, etc.).
        {submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      <label style={lbl}>Business / client name</label>
      <input style={{ ...inp, maxWidth: 420 }} value={data.client_name}
        onChange={(e) => setData((d) => ({ ...d, client_name: e.target.value }))} />

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table className="resp-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>{cols.map((c) => <th key={c.key} style={th}>{c.label}</th>)}<th style={th}></th></tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.key} data-label={c.label} style={td}>
                    <input style={inp} value={r[c.key]} onChange={(e) => setRow(i, { [c.key]: e.target.value } as Partial<DebtRow>)} />
                  </td>
                ))}
                <td data-label="" style={td}>
                  {data.rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} style={{ border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer", fontSize: 16 }}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addRow} style={{ marginTop: 8, border: "1px solid #cbd5e1", background: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "#0f172a" }}>+ Add debt</button>

      <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}>
        <div>Total balance: <strong>{money(totals.balance)}</strong></div>
        <div>Total monthly payments: <strong>{money(totals.monthly)}</strong></div>
      </div>

      <label style={lbl}>Notes</label>
      <textarea style={{ ...inp, minHeight: 60 }} value={data.notes} onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))} />

      {error && <p style={{ color: "#991b1b", fontSize: 13, marginTop: 12 }}>{error}</p>}

      <button type="button" disabled={submitting} onClick={() => void handleSubmit()}
        style={{ marginTop: 16, padding: "12px 24px", background: "#0b1320", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600, opacity: submitting ? 0.6 : 1 }}>
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
