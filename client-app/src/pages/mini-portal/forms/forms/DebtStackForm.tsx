// BF_CLIENT_BLOCK_TWO_STAGE_v1 -- Debt Stack form. Digital version
// of Debt_Stack_Template.xlsx. Repeatable line-item table with the
// 11 columns from the template plus auto-summed totals.
import { useCallback, useEffect, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";

type DebtLine = {
  item?: string;
  year?: string;
  make?: string;
  model?: string;
  description?: string;
  estimated_value?: number;
  lender?: string;
  free_and_clear?: boolean;
  structure?: "loan" | "lease" | "";
  monthly_payment?: number;
  balance?: number;
};

type DebtStackData = {
  client_name?: string;
  lines?: DebtLine[];
  attest_complete?: boolean;
  signature_typed_name?: string;
  signature_date?: string;
};

const EMPTY: DebtStackData = { lines: [{}, {}, {}] };

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "5px 6px", fontSize: 12, borderRadius: 3,
  border: "1px solid #d1d5db", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block",
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v || "0"));
  return Number.isFinite(n) ? n : 0;
}
function money(n: number): string {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export default function DebtStackForm({
  applicationId,
  onComplete,
}: { applicationId: string; onComplete: () => void }) {
  const [data, setData] = useState<DebtStackData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const existing = await getFormResponse(applicationId, "debt_stack");
        if (existing) {
          setData({ ...EMPTY, ...(existing.data as DebtStackData) });
          setSubmitted(!!existing.submitted_at);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        setLoaded(true);
      }
    })();
  }, [applicationId]);

  const update = (patch: Partial<DebtStackData>) => setData((d) => ({ ...d, ...patch }));

  const updateLine = (idx: number, patch: Partial<DebtLine>) => {
    setData((d) => {
      const lines = [...(d.lines || [])];
      lines[idx] = { ...lines[idx], ...patch };
      return { ...d, lines };
    });
  };

  const addLine = () => setData((d) => ({ ...d, lines: [...(d.lines || []), {}] }));
  const removeLine = (idx: number) => setData((d) => ({ ...d, lines: (d.lines || []).filter((_, i) => i !== idx) }));

  const autosave = useCallback(async () => {
    setSaving(true);
    try {
      await saveFormResponse(applicationId, "debt_stack", data as unknown as Record<string, unknown>);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [applicationId, data]);

  const handleSubmit = async () => {
    if (!data.attest_complete) {
      alert("Please confirm completeness before submitting.");
      return;
    }
    if (!data.signature_typed_name?.trim()) {
      alert("Please type your full legal name as your signature.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFormResponse(applicationId, "debt_stack", data as unknown as Record<string, unknown>);
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) return <div>Loading form...</div>;

  const lines = data.lines || [];
  const totalValue   = lines.reduce((a, l) => a + num(l.estimated_value), 0);
  const totalPayment = lines.reduce((a, l) => a + num(l.monthly_payment), 0);
  const totalBalance = lines.reduce((a, l) => a + num(l.balance), 0);

  return (
    <div onBlur={() => void autosave()}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Debt stack</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
        {saving ? "Saving..." : "Saved"}{error ? ` — ${error}` : ""}
        {submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      <div style={{ marginBottom: 16, maxWidth: 360 }}>
        <label style={labelStyle}>Client / company name</label>
        <input style={inputStyle} value={data.client_name ?? ""} onChange={(e) => update({ client_name: e.target.value })} />
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              {["Item", "Year", "Make", "Model", "Description", "Est. value", "Lender", "Free & clear", "Structure", "Monthly pmt", "Balance", ""].map((h) => (
                <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td style={{ padding: 3 }}><input style={inputStyle} value={line.item ?? ""} onChange={(e) => updateLine(i, { item: e.target.value })} /></td>
                <td style={{ padding: 3, width: 60 }}><input style={inputStyle} value={line.year ?? ""} onChange={(e) => updateLine(i, { year: e.target.value })} /></td>
                <td style={{ padding: 3, width: 90 }}><input style={inputStyle} value={line.make ?? ""} onChange={(e) => updateLine(i, { make: e.target.value })} /></td>
                <td style={{ padding: 3, width: 90 }}><input style={inputStyle} value={line.model ?? ""} onChange={(e) => updateLine(i, { model: e.target.value })} /></td>
                <td style={{ padding: 3 }}><input style={inputStyle} value={line.description ?? ""} onChange={(e) => updateLine(i, { description: e.target.value })} /></td>
                <td style={{ padding: 3, width: 100 }}><input style={inputStyle} type="number" value={line.estimated_value ?? ""} onChange={(e) => updateLine(i, { estimated_value: parseFloat(e.target.value) || 0 })} /></td>
                <td style={{ padding: 3, width: 110 }}><input style={inputStyle} value={line.lender ?? ""} onChange={(e) => updateLine(i, { lender: e.target.value })} /></td>
                <td style={{ padding: 3, textAlign: "center", width: 70 }}>
                  <input type="checkbox" checked={!!line.free_and_clear} onChange={(e) => updateLine(i, { free_and_clear: e.target.checked })} />
                </td>
                <td style={{ padding: 3, width: 90 }}>
                  <select style={inputStyle} value={line.structure ?? ""} onChange={(e) => updateLine(i, { structure: e.target.value as "loan" | "lease" | "" })}>
                    <option value=""></option>
                    <option value="loan">Loan</option>
                    <option value="lease">Lease</option>
                  </select>
                </td>
                <td style={{ padding: 3, width: 100 }}><input style={inputStyle} type="number" value={line.monthly_payment ?? ""} onChange={(e) => updateLine(i, { monthly_payment: parseFloat(e.target.value) || 0 })} /></td>
                <td style={{ padding: 3, width: 100 }}><input style={inputStyle} type="number" value={line.balance ?? ""} onChange={(e) => updateLine(i, { balance: parseFloat(e.target.value) || 0 })} /></td>
                <td style={{ padding: 3, width: 36, textAlign: "center" }}>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(i)} style={{ background: "transparent", border: 0, color: "#dc2626", cursor: "pointer", fontSize: 18 }}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ background: "#f9fafb", fontWeight: 700 }}>
            <tr>
              <td colSpan={5} style={{ padding: "10px 6px", borderTop: "2px solid #111827", textAlign: "right" }}>TOTAL</td>
              <td style={{ padding: "10px 6px", borderTop: "2px solid #111827" }}>{money(totalValue)}</td>
              <td colSpan={3} style={{ borderTop: "2px solid #111827" }}></td>
              <td style={{ padding: "10px 6px", borderTop: "2px solid #111827" }}>{money(totalPayment)}</td>
              <td style={{ padding: "10px 6px", borderTop: "2px solid #111827" }}>{money(totalBalance)}</td>
              <td style={{ borderTop: "2px solid #111827" }}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button onClick={addLine}
        style={{ marginTop: 12, padding: "6px 12px", fontSize: 13, background: "#fff", border: "1px solid #2563eb", color: "#2563eb", borderRadius: 4, cursor: "pointer" }}>
        + Add line
      </button>

      <div style={{ marginTop: 24, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Attestation</div>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12, fontSize: 13 }}>
          <input type="checkbox" checked={!!data.attest_complete} onChange={(e) => update({ attest_complete: e.target.checked })} />
          <span>I confirm this is a complete and accurate list of the company's existing debt obligations.</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={labelStyle}>Typed signature</label><input style={inputStyle} value={data.signature_typed_name ?? ""} onChange={(e) => update({ signature_typed_name: e.target.value })} /></div>
          <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={data.signature_date ?? ""} onChange={(e) => update({ signature_date: e.target.value })} /></div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
        <button onClick={() => void autosave()} disabled={saving}
          style={{ padding: "10px 18px", fontSize: 13, background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer" }}>
          {saving ? "Saving..." : "Save draft"}
        </button>
        <button onClick={() => void handleSubmit()} disabled={submitting}
          style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, background: "#2563eb", color: "#fff", border: 0, borderRadius: 4, cursor: "pointer" }}>
          {submitting ? "Submitting..." : submitted ? "Re-submit" : "Submit form"}
        </button>
      </div>
    </div>
  );
}
