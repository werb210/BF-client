// BF_CLIENT_BLOCK_v307_DEBT_EQUIP_PREFILL_v1 — Equipment Collateral.
// First-draft equipment list: each row is a piece of equipment offered as
// collateral. Business name prefilled from application data.
// Persists via the generic form-responses endpoint, key "equipment_list".
// BF_CLIENT_v805_FORMS - phone layout: only the items in use are shown (the
// second empty starter row stays in the payload but hidden until "+ Add
// equipment"), a labelled Remove button, money keypads, pinned Submit, and a
// localStorage draft.
import { useEffect, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";
import { A11Y_COLORS } from "@/styles/a11yColors"; // BF_CLIENT_v789_CONTRAST
import { MoneyInput, mergeDraft, readDraft, useFormDraft, visibleCount } from "../cmpFormKit"; // BF_CLIENT_v805_FORMS

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
  payment: string; // BF_CLIENT_BLOCK_v_EQUIP_PAYMENT_COL_v1 - payment amount on the equipment
};
type EquipData = { business_name: string; rows: EquipRow[]; notes: string };

const emptyRow = (): EquipRow => ({
  year: "", make: "", model: "", description: "", serial: "",
  condition: "", value: "", lienholder: "", balance: "", payment: "",
});
const emptyData = (): EquipData => ({ business_name: "", rows: [emptyRow(), emptyRow()], notes: "" });

const num = (v: string) => {
  const n = parseFloat((v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;


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
  const [revealed, setRevealed] = useState(1); // BF_CLIENT_v805_FORMS
  const clearLocalDraft = useFormDraft(FORM_KEY, applicationId, data, loaded);

  useEffect(() => {
    const draft = readDraft<EquipData>(FORM_KEY, applicationId); // BF_CLIENT_v805_FORMS
    const withDraft = (d: EquipData): EquipData => {
      if (!draft) return d;
      const m = mergeDraft(d, draft);
      return { ...m, rows: (Array.isArray(m.rows) ? m.rows : d.rows).map((r) => ({ ...emptyRow(), ...r })) };
    };
    void (async () => {
      const preName = String((prefill?.businessName ?? prefill?.fullName ?? "") || "");
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        if (existing?.data) {
          const d = existing.data as Partial<EquipData>;
          setData(withDraft({
            business_name: d.business_name || preName,
            rows: Array.isArray(d.rows) && d.rows.length ? d.rows.map((r) => ({ ...emptyRow(), ...r })) : emptyData().rows,
            notes: d.notes || "",
          }));
          setSubmitted(!!existing.submitted_at);
          setLoaded(true);
          return;
        }
      } catch {
        // first open
      }
      setData((d) => withDraft({ ...d, business_name: preName }));
      setLoaded(true);
    })();
  }, [applicationId, prefill]);

  const persist = (next: EquipData) => { void saveFormResponse(applicationId, FORM_KEY, next as unknown as Record<string, unknown>).catch(() => {}); };
  const setRow = (i: number, patch: Partial<EquipRow>) =>
    setData((d) => ({ ...d, rows: d.rows.map((r, idx): EquipRow => (idx === i ? { ...r, ...patch } : r)) }));
  // BF_CLIENT_v805_FORMS - "+ Add equipment" first reveals a hidden starter row,
  // and only appends a new one when every row is already on screen.
  const shown = visibleCount(data.rows, revealed);
  const addRow = () => {
    if (shown < data.rows.length) { setRevealed(shown + 1); return; }
    setRevealed(shown + 1);
    setData((d) => ({ ...d, rows: [...d.rows, emptyRow()] }));
  };
  const removeRow = (i: number) => {
    setRevealed(Math.max(1, shown - 1));
    setData((d) => ({ ...d, rows: d.rows.length > 1 ? d.rows.filter((_, idx) => idx !== i) : d.rows }));
  };

  const totals = {
    value: data.rows.reduce((s, r) => s + num(r.value), 0),
    balance: data.rows.reduce((s, r) => s + num(r.balance), 0),
    payment: data.rows.reduce((s, r) => s + num(r.payment), 0),
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitFormResponse(applicationId, FORM_KEY, { ...data, totals, submitted_at: new Date().toISOString() });
      clearLocalDraft(); // BF_CLIENT_v805_FORMS
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
    { key: "payment", label: "Payment amt." },
  ];

  // BF_CLIENT_v805_FORMS - one card per item (a 10-column table was a sideways
  // scroll in the modal and a long stack on a phone), Remove at the end of each.
  const MONEY_COLS = new Set<keyof EquipRow>(["value", "balance", "payment"]);
  const cell = (i: number, r: EquipRow, c: { key: keyof EquipRow; label: string }) => {
    const id = `equip-${i}-${c.key}`;
    const common = {
      id,
      value: r[c.key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setRow(i, { [c.key]: e.target.value } as Partial<EquipRow>),
    };
    return (
      <div key={c.key}>
        <label className="cmpf-label" htmlFor={id}>{c.label}</label>
        {MONEY_COLS.has(c.key) ? <MoneyInput {...common} /> : (
          <input className="cmpf-input" inputMode={c.key === "year" ? "numeric" : undefined} {...common} />
        )}
      </div>
    );
  };

  return (
    <div className="cmpf" onBlur={() => persist(data)}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Equipment Collateral</h2>
      <p className="cmpf-intro">
        List the equipment offered as collateral. Include any existing lien and balance owing so the net value is clear.
        {submitted && <span style={{ marginLeft: 12, color: A11Y_COLORS.successText, fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      <label className="cmpf-label" htmlFor="equip-business-name">Business name</label>
      <input id="equip-business-name" className="cmpf-input" style={{ maxWidth: 420 }} value={data.business_name}
        onChange={(e) => setData((d) => ({ ...d, business_name: e.target.value }))} />

      <div style={{ marginTop: 14 }}>
        {data.rows.slice(0, shown).map((r, i) => (
          <div key={i} className="cmpf-card" data-testid={`equip-item-${i}`}>
            <div className="cmpf-card-title">Item {i + 1}</div>
            <div className="cmp-grid-3">
              {cols.map((c) => cell(i, r, c))}
            </div>
            {shown > 1 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <button type="button" className="cmpf-remove" aria-label={`Remove item ${i + 1}`} onClick={() => removeRow(i)}>Remove</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="cmpf-add" onClick={addRow}>+ Add equipment</button>

      <div className="cmpf-totals">
        <div>Total estimated value: <strong>{money(totals.value)}</strong></div>
        <div>Total balance owing: <strong>{money(totals.balance)}</strong></div>
        <div>Total payments: <strong>{money(totals.payment)}</strong></div>
        <div style={{ marginTop: 4 }}>Net equity: <strong>{money(totals.value - totals.balance)}</strong></div>
      </div>

      <label className="cmpf-label" htmlFor="equip-notes">Notes</label>
      <textarea id="equip-notes" className="cmpf-textarea" value={data.notes} onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))} />

      {error && <p className="cmpf-error">{error}</p>}

      <div className="cmpf-actions">
        <button type="button" className="cmpf-primary" disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
