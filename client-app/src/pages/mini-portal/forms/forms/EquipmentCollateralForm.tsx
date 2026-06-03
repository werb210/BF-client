// BF_CLIENT_BLOCK_v307_DEBT_EQUIP_PREFILL_v1 — Equipment Collateral.
// First-draft equipment list: each row is a piece of equipment offered as
// collateral. Business name prefilled from application data.
// Persists via the generic form-responses endpoint, key "equipment_list".
import { useEffect, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";

const FORM_KEY = "equipment_list";

type EquipRow = {
  year: string;
  make: string;
  model: string;
  description: string;
  serial: string;
  condition: string;
  value: string;
  lienholder: string;
  balance: string;
};
type EquipData = { business_name: string; rows: EquipRow[]; notes: string };

const emptyRow = (): EquipRow => ({
  year: "", make: "", model: "", description: "", serial: "",
  condition: "", value: "", lienholder: "", balance: "",
});
const emptyData = (): EquipData => ({ business_name: "", rows: [emptyRow(), emptyRow()], notes: "" });

const num = (v: string) => {
  const n = parseFloat((v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const lbl = { display: "block", fontSize: 11, fontWeight: 600, color: "#374151", margin: "6px 0 2px" } as const;
const inp = { width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5, boxSizing: "border-box" as const } as const;
const th = { textAlign: "left" as const, padding: "6px 6px", fontSize: 10, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" as const } as const;
const td = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" as const } as const;

export default function EquipmentCollateralForm({
  applicationId,
  prefill,
  onComplete,
}: { applicationId: string; prefill?: Record<string, unknown>; onComplete: () => void }) {
  const [data, setData] = useState<EquipData>(emptyData());
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
          const d = existing.data as Partial<EquipData>;
          setData({
            business_name: d.business_name || preName,
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
      setData((d) => ({ ...d, business_name: preName }));
      setLoaded(true);
    })();
  }, [applicationId, prefill]);

  const persist = (next: EquipData) => { void saveFormResponse(applicationId, FORM_KEY, next as unknown as Record<string, unknown>).catch(() => {}); };
  const setRow = (i: number, patch: Partial<EquipRow>) =>
    setData((d) => ({ ...d, rows: d.rows.map((r, idx): EquipRow => (idx === i ? { ...r, ...patch } : r)) }));
  const addRow = () => setData((d) => ({ ...d, rows: [...d.rows, emptyRow()] }));
  const removeRow = (i: number) => setData((d) => ({ ...d, rows: d.rows.length > 1 ? d.rows.filter((_, idx) => idx !== i) : d.rows }));

  const totals = {
    value: data.rows.reduce((s, r) => s + num(r.value), 0),
    balance: data.rows.reduce((s, r) => s + num(r.balance), 0),
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

  const cols: Array<{ key: keyof EquipRow; label: string }> = [
    { key: "year", label: "Year" },
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "description", label: "Description" },
    { key: "serial", label: "Serial / VIN" },
    { key: "condition", label: "Condition" },
    { key: "value", label: "Est. value" },
    { key: "lienholder", label: "Lienholder (if any)" },
    { key: "balance", label: "Balance owing" },
  ];

  return (
    <div onBlur={() => persist(data)}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Equipment Collateral</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
        List the equipment offered as collateral. Include any existing lien and balance owing so the net value is clear.
        {submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      <label style={lbl}>Business name</label>
      <input style={{ ...inp, maxWidth: 420 }} value={data.business_name}
        onChange={(e) => setData((d) => ({ ...d, business_name: e.target.value }))} />

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr>{cols.map((c) => <th key={c.key} style={th}>{c.label}</th>)}<th style={th}></th></tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.key} style={td}>
                    <input style={inp} value={r[c.key]} onChange={(e) => setRow(i, { [c.key]: e.target.value } as Partial<EquipRow>)} />
                  </td>
                ))}
                <td style={td}>
                  {data.rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} style={{ border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer", fontSize: 16 }}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addRow} style={{ marginTop: 8, border: "1px solid #cbd5e1", background: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "#0f172a" }}>+ Add equipment</button>

      <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}>
        <div>Total estimated value: <strong>{money(totals.value)}</strong></div>
        <div>Total balance owing: <strong>{money(totals.balance)}</strong></div>
        <div style={{ marginTop: 4 }}>Net equity: <strong>{money(totals.value - totals.balance)}</strong></div>
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
