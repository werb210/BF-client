// BF_CLIENT_v852_CALC_QBO - the loan amortization calculator (Andrew's request). Inputs: amount, annual rate, term in months,
// payment frequency, optional down payment and balloon / residual. Outputs: payment per period, number of payments,
// total interest, total cost and the full schedule, with Download PDF, Download spreadsheet (CSV) and, where the
// caller passes onSaveNote, Save to file (the scenario saved as a note on the application). The maths is in loanMath.ts.
// Light panel, dark text (navy on white, muted slate, red / green notices) so it reads the same in any theme.
import { useMemo, useState, type CSSProperties } from "react";
import { FREQUENCIES, calculateLoan, money, scenarioNote, scheduleCsv, summaryLines, todayLocal, validateLoan, type Frequency, type LoanInput } from "./loanMath";
import { buildSchedulePdf } from "./loanPdf";
import { saveGeneratedFile } from "./saveFile";

export type LoanCalculatorProps = {
  initialAmount?: number | null;
  /** Shown on the PDF (e.g. the business name). */
  title?: string;
  /** Save to file: given the scenario text, saves it as a note. Leave out to hide the button. */
  onSaveNote?: (text: string) => Promise<void>;
  /** "phone" stacks everything in one column with a smaller table. */
  layout?: "wide" | "phone";
};

const NAVY = "#0B1F3A";
const MUTED = "#475569";
const BORDER = "#cbd5e1";

const parseNum = (s: string): number => {
  const t = s.replace(/[$,\s]/g, "");
  return t === "" ? NaN : Number(t);
};
const optNum = (s: string): number => (s.trim() === "" ? 0 : parseNum(s));

function fileStem(title?: string): string {
  const base = (title ?? "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return (base ? base + "-" : "") + "loan-schedule";
}

export default function LoanCalculator({ initialAmount, title, onSaveNote, layout = "wide" }: LoanCalculatorProps) {
  const phone = layout === "phone";
  const [amount, setAmount] = useState(initialAmount && initialAmount > 0 ? String(Math.round(initialAmount * 100) / 100) : "");
  const [rate, setRate] = useState("");
  const [term, setTerm] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [down, setDown] = useState("");
  const [balloon, setBalloon] = useState("");
  const [startDate, setStartDate] = useState(() => todayLocal());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const input: LoanInput = useMemo(() => ({
    amount: parseNum(amount), annualRatePct: parseNum(rate), termMonths: parseNum(term), frequency,
    downPayment: optNum(down), balloon: optNum(balloon), startDate,
  }), [amount, rate, term, frequency, down, balloon, startDate]);
  const ready = amount.trim() !== "" && rate.trim() !== "" && term.trim() !== "";
  const errors = useMemo(() => (ready ? validateLoan(input) : []), [input, ready]);
  const result = useMemo(() => (ready && errors.length === 0 ? calculateLoan(input) : null), [input, ready, errors]);

  const field: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid " + BORDER, borderRadius: 6, fontSize: phone ? 16 : 14, color: NAVY, background: "#ffffff" };
  const labelStyle: CSSProperties = { display: "grid", gap: 4, fontSize: 13, fontWeight: 600, color: NAVY };
  const btn: CSSProperties = { background: NAVY, color: "#ffffff", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer" };
  const btn2: CSSProperties = { ...btn, background: "#ffffff", color: NAVY, border: "1px solid " + NAVY };

  const download = async (kind: "pdf" | "csv") => {
    if (!result) return;
    setNote(null);
    try {
      const out = kind === "pdf"
        ? await saveGeneratedFile(buildSchedulePdf(input, result, title ?? "", todayLocal()), fileStem(title) + ".pdf", "application/pdf")
        : await saveGeneratedFile(scheduleCsv(input, result), fileStem(title) + ".csv", "text/csv");
      if (out !== "cancelled") setNote({ ok: true, text: kind === "pdf" ? "PDF ready." : "Spreadsheet ready (CSV, opens in Excel)." });
    } catch (e) {
      setNote({ ok: false, text: "Could not create the file: " + ((e as Error)?.message ?? "unknown error") });
    }
  };

  const save = async () => {
    if (!result || !onSaveNote) return;
    setBusy(true);
    setNote(null);
    try {
      await onSaveNote(scenarioNote(input, result));
      setNote({ ok: true, text: "Saved to the file as a note." });
    } catch (e) {
      setNote({ ok: false, text: "Could not save the note: " + ((e as Error)?.message ?? "unknown error") });
    } finally {
      setBusy(false);
    }
  };

  const grid: CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: phone ? "1fr" : "repeat(auto-fit, minmax(170px, 1fr))" };
  const th: CSSProperties = { textAlign: "right", padding: "6px 8px", borderBottom: "1px solid " + BORDER, color: NAVY, fontWeight: 700, position: "sticky", top: 0, background: "#f1f5f9", whiteSpace: "nowrap" };
  const td: CSSProperties = { textAlign: "right", padding: phone ? "4px 6px" : "5px 8px", borderBottom: "1px solid #e2e8f0", color: NAVY, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };

  return (
    <div data-testid="loan-calculator" style={{ color: NAVY, background: "#ffffff", display: "grid", gap: 16, fontSize: 14 }}>
      <div style={grid}>
        <label style={labelStyle}>Amount ($)
          <input data-testid="calc-amount" type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 250000" style={field} />
        </label>
        <label style={labelStyle}>Interest rate (% a year)
          <input data-testid="calc-rate" type="text" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 9.5" style={field} />
        </label>
        <label style={labelStyle}>Term (months)
          <input data-testid="calc-term" type="text" inputMode="numeric" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. 60" style={field} />
        </label>
        <label style={labelStyle}>Payment frequency
          <select data-testid="calc-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} style={field}>
            {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Down payment ($, optional)
          <input data-testid="calc-down" type="text" inputMode="decimal" value={down} onChange={(e) => setDown(e.target.value)} placeholder="0" style={field} />
        </label>
        <label style={labelStyle}>Balloon / residual ($, optional)
          <input data-testid="calc-balloon" type="text" inputMode="decimal" value={balloon} onChange={(e) => setBalloon(e.target.value)} placeholder="0" style={field} />
        </label>
        <label style={labelStyle}>Start date
          <input data-testid="calc-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={field} />
        </label>
      </div>

      {!ready && <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>Enter the amount, rate and term to see the payments. Daily payments are business days (Monday to Friday, 260 a year).</p>}
      {errors.length > 0 && (
        <div role="alert" data-testid="calc-errors" style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 10px", fontSize: 13, fontWeight: 600 }}>
          {errors.map((e) => <div key={e}>{e}</div>)}
        </div>
      )}

      {result && (
        <>
          <div data-testid="calc-summary" style={{ display: "grid", gap: 8, gridTemplateColumns: phone ? "1fr 1fr" : "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {[
              ["Payment per period", money(result.paymentPerPeriod)],
              ["Number of payments", String(result.numberOfPayments)],
              ["Total interest", money(result.totalInterest)],
              ["Total cost", money(result.totalCost)],
            ].map(([k, v]) => (
              <div key={k} style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "8px 10px", background: "#f8fafc" }}>
                <div style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{k}</div>
                <div data-testid={"calc-out-" + String(k).toLowerCase().replace(/[^a-z]+/g, "-")} style={{ fontSize: phone ? 17 : 19, fontWeight: 700, color: NAVY }}>{v}</div>
              </div>
            ))}
          </div>
          <details style={{ fontSize: 13, color: NAVY }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>All figures</summary>
            <dl style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "4px 16px", margin: "8px 0 0" }}>
              {summaryLines(input, result).map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}><dt style={{ color: MUTED }}>{k}</dt><dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd></div>
              ))}
            </dl>
          </details>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" data-testid="calc-pdf" onClick={() => void download("pdf")} style={btn}>Download PDF</button>
            <button type="button" data-testid="calc-csv" onClick={() => void download("csv")} style={btn2}>Download spreadsheet</button>
            {onSaveNote && <button type="button" data-testid="calc-save" disabled={busy} onClick={() => void save()} style={btn2}>{busy ? "Saving..." : "Save to file"}</button>}
          </div>
          {note && <div role="status" data-testid="calc-note" style={{ fontSize: 13, fontWeight: 600, color: note.ok ? "#065f46" : "#991b1b" }}>{note.text}</div>}

          <div style={{ maxHeight: phone ? "45vh" : 360, overflow: "auto", border: "1px solid " + BORDER, borderRadius: 8, WebkitOverflowScrolling: "touch" }}>
            <table data-testid="calc-schedule" style={{ borderCollapse: "collapse", width: "100%", fontSize: phone ? 12 : 13 }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={{ ...th, textAlign: "left" }}>Date</th>
                  <th style={th}>Payment</th>
                  <th style={th}>Principal</th>
                  <th style={th}>Interest</th>
                  <th style={th}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((r) => (
                  <tr key={r.n}>
                    <td style={td}>{r.n}</td>
                    <td style={{ ...td, textAlign: "left" }}>{r.date}</td>
                    <td style={td}>{money(r.payment)}</td>
                    <td style={td}>{money(r.principal)}</td>
                    <td style={td}>{money(r.interest)}</td>
                    <td style={td}>{money(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, color: MUTED, fontSize: 12 }}>An estimate only: the lender's documents set the actual payments.{result.balloon > 0 ? " The balloon is paid with the last payment." : ""}</p>
        </>
      )}
    </div>
  );
}
