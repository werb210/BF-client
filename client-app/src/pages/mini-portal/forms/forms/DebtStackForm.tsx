// BF_CLIENT_BLOCK_v307_DEBT_EQUIP_PREFILL_v1 — Debt Stack (existing-debt schedule).
// First-draft debt schedule: each row is an existing facility/obligation the
// business owes. Client name prefilled from application data.
// Persists via the generic form-responses endpoint, key "debt_stack".
// BF_CLIENT_v805_FORMS - one card per debt with a labelled Remove, the second
// empty starter row hidden (still submitted) until "+ Add debt", money
// keypads, pinned Submit, and a localStorage draft.
import { useEffect, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";
import { A11Y_COLORS } from "@/styles/a11yColors"; // BF_CLIENT_v789_CONTRAST
import { MoneyInput, mergeDraft, readDraft, useFormDraft, visibleCount } from "../cmpFormKit"; // BF_CLIENT_v805_FORMS

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
  const [revealed, setRevealed] = useState(1); // BF_CLIENT_v805_FORMS
  const clearLocalDraft = useFormDraft(FORM_KEY, applicationId, data, loaded);

  useEffect(() => {
    const draft = readDraft<DebtData>(FORM_KEY, applicationId); // BF_CLIENT_v805_FORMS
    const withDraft = (d: DebtData): DebtData => {
      if (!draft) return d;
      const m = mergeDraft(d, draft);
      return { ...m, rows: (Array.isArray(m.rows) ? m.rows : d.rows).map((r) => ({ ...emptyRow(), ...r })) };
    };
    void (async () => {
      const preName = String((prefill?.businessName ?? prefill?.fullName ?? "") || "");
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        if (existing?.data) {
          const d = existing.data as Partial<DebtData>;
          setData(withDraft({
            client_name: d.client_name || preName,
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
      setData((d) => withDraft({ ...d, client_name: preName }));
      setLoaded(true);
    })();
  }, [applicationId, prefill]);

  const persist = (next: DebtData) => { void saveFormResponse(applicationId, FORM_KEY, next as unknown as Record<string, unknown>).catch(() => {}); };
  const setRow = (i: number, patch: Partial<DebtRow>) =>
    setData((d) => ({ ...d, rows: d.rows.map((r, idx): DebtRow => (idx === i ? { ...r, ...patch } : r)) }));
  // BF_CLIENT_v805_FORMS - reveal a hidden starter row before appending.
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
    balance: data.rows.reduce((s, r) => s + num(r.balance), 0),
    monthly: data.rows.reduce((s, r) => s + num(r.monthly_payment), 0),
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

  const MONEY_COLS = new Set<keyof DebtRow>(["original_amount", "balance", "monthly_payment"]);
  const cell = (i: number, r: DebtRow, c: { key: keyof DebtRow; label: string }) => {
    const id = `debt-${i}-${c.key}`;
    const common = {
      id,
      value: r[c.key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setRow(i, { [c.key]: e.target.value } as Partial<DebtRow>),
    };
    return (
      <div key={c.key}>
        <label className="cmpf-label" htmlFor={id}>{c.label}</label>
        {MONEY_COLS.has(c.key) ? <MoneyInput {...common} /> : (
          <input className="cmpf-input" inputMode={c.key === "rate" ? "decimal" : undefined} {...common} />
        )}
      </div>
    );
  };

  return (
    <div className="cmpf" onBlur={() => persist(data)}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Debt Schedule</h2>
      <p className="cmpf-intro">
        List the business's existing debts and obligations (term loans, lines of credit, leases, etc.).
        {submitted && <span style={{ marginLeft: 12, color: A11Y_COLORS.successText, fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      <label className="cmpf-label" htmlFor="debt-client-name">Business / client name</label>
      <input id="debt-client-name" className="cmpf-input" style={{ maxWidth: 420 }} value={data.client_name}
        onChange={(e) => setData((d) => ({ ...d, client_name: e.target.value }))} />

      <div style={{ marginTop: 14 }}>
        {data.rows.slice(0, shown).map((r, i) => (
          <div key={i} className="cmpf-card" data-testid={`debt-item-${i}`}>
            <div className="cmpf-card-title">Debt {i + 1}</div>
            <div className="cmp-grid-2">
              {cols.map((c) => cell(i, r, c))}
            </div>
            {shown > 1 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <button type="button" className="cmpf-remove" aria-label={`Remove debt ${i + 1}`} onClick={() => removeRow(i)}>Remove</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="cmpf-add" onClick={addRow}>+ Add debt</button>

      <div className="cmpf-totals">
        <div>Total balance: <strong>{money(totals.balance)}</strong></div>
        <div>Total monthly payments: <strong>{money(totals.monthly)}</strong></div>
      </div>

      <label className="cmpf-label" htmlFor="debt-notes">Notes</label>
      <textarea id="debt-notes" className="cmpf-textarea" value={data.notes} onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))} />

      {error && <p className="cmpf-error">{error}</p>}

      <div className="cmpf-actions">
        <button type="button" className="cmpf-primary" disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
