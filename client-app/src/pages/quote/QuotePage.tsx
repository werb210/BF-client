// BF_CLIENT_v872_QUOTES - "Your quote" (/quote/:quoteId): the financing options Boreal prepared, side by side -
// amount, term, rate or factor, payment, fees, funds received, total repaid, total cost of borrowing, estimated APR -
// with the branded PDF, and accept one (type your name, tick to confirm) or decline. Opening it tells Boreal it
// was viewed. Reached from the client-portal button (cta_action quote:<id>) or the text/push link.
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiCall } from "@/api/client";
import { getToken } from "@/auth/token";
import { ENV } from "@/env";
import { A11Y_COLORS } from "@/styles/a11yColors";

type Fee = { label: string; amount: number; deducted: boolean; taxable?: boolean };
type TaxLine = { label: string; amount: number };
type Option = {
  id: string; lender_name: string; product_name: string | null; amount: number; term_months: number | null; rate_kind: "interest_rate" | "factor_rate";
  rate: number | null; payment_frequency: string; payment_count: number | null; payment_amount: number | null; fees: Fee[]; tax_lines?: TaxLine[]; total_tax?: number; total_fees: number;
  total_repayment: number | null; cost_of_borrowing: number | null; net_proceeds: number | null; estimated_apr: number | null; recommended: boolean; notes: string | null;
};
type Quote = { id: string; quote_number: string; status: string; title: string; message: string | null; currency: string; expires_on: string | null; accepted_option_id: string | null; options: Option[] };

const FREQ: Record<string, string> = { daily: "a business day", weekly: "a week", biweekly: "every two weeks", semimonthly: "twice a month", monthly: "a month" };
const money = (n: number | null | undefined, cur: string) => (n === null || n === undefined ? "-" : `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur === "USD" ? " USD" : ""}`);
const term = (m: number | null) => (!m ? "-" : m < 1 ? `${Math.round((m * 365) / 12)} days` : `${Number.isInteger(m) ? m : m.toFixed(1)} months`);

const s = {
  page: { maxWidth: 720, margin: "0 auto", padding: "24px 16px 48px", color: "#0B1F3A" } as const,
  h1: { fontSize: 24, fontWeight: 700, margin: "0 0 6px" } as const,
  p: { fontSize: 16, lineHeight: 1.5, color: "#374151", margin: "0 0 12px" } as const,
  card: (on: boolean) => ({ border: on ? `2px solid ${A11Y_COLORS.actionBg}` : "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginTop: 14, background: "#ffffff" }) as const,
  row: { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 15, padding: "4px 0", borderTop: "1px solid #f3f4f6" } as const,
  k: { color: "#4b5563" } as const,
  btn: { minHeight: 48, padding: "12px 20px", borderRadius: 10, border: "none", background: A11Y_COLORS.actionBg, color: "#ffffff", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%" } as const,
  ghost: { minHeight: 44, padding: "10px 16px", borderRadius: 10, border: "1px solid #d1d5db", background: "#ffffff", color: "#0B1F3A", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 10 } as const,
  input: { width: "100%", boxSizing: "border-box" as const, minHeight: 44, padding: "10px 12px", fontSize: 16, borderRadius: 8, border: "1px solid #9ca3af", color: "#0B1F3A" } as const,
  badge: { display: "inline-block", marginLeft: 8, padding: "2px 8px", borderRadius: 999, background: "#fef3c7", color: "#78350f", fontSize: 12, fontWeight: 700 } as const,
  err: { color: "#b91c1c", fontSize: 15, marginTop: 10 } as const,
  ok: { color: A11Y_COLORS.successText, fontWeight: 600, fontSize: 16 } as const,
};

export default function QuotePage() {
  const { quoteId = "" } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<string>("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try { const r = await apiCall<{ ok: boolean; quote: Quote }>(`/api/client/quotes/${encodeURIComponent(quoteId)}`); setQ(r.quote); setError(null); }
    catch { setError("We could not open this quote. Please check your connection, or ask your advisor to send it again."); }
  }, [quoteId]);
  useEffect(() => { void load(); }, [load]);

  const errMsg = (e: unknown, fallback: string) => {
    const body = (e as { body?: { message?: string } })?.body;
    return body?.message || fallback;
  };

  const accept = async () => {
    if (!pick) { setError("Please choose one of the options."); return; }
    setBusy(true); setError(null);
    try { const r = await apiCall<{ ok: boolean; quote: Quote }>(`/api/client/quotes/${encodeURIComponent(quoteId)}/accept`, { method: "POST", body: { option_id: pick, name, agree } as any }); setQ(r.quote); }
    catch (e) { setError(errMsg(e, "We could not record your choice. Please try again.")); }
    finally { setBusy(false); }
  };
  const decline = async () => {
    setBusy(true); setError(null);
    try { const r = await apiCall<{ ok: boolean; quote: Quote }>(`/api/client/quotes/${encodeURIComponent(quoteId)}/decline`, { method: "POST", body: { reason } as any }); setQ(r.quote); setDeclining(false); }
    catch (e) { setError(errMsg(e, "We could not send that. Please try again.")); }
    finally { setBusy(false); }
  };
  const openPdf = async () => {
    try {
      const res = await fetch(`${ENV.API_BASE}/api/client/quotes/${encodeURIComponent(quoteId)}/pdf`, { headers: { Authorization: `Bearer ${getToken() ?? ""}` } });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank", "noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { setError("We could not open the PDF. Please try again."); }
  };

  if (!q) return <main style={s.page}>{error ? <p role="alert" style={s.err}>{error}</p> : <p style={s.p}>Loading…</p>}</main>;
  const open = q.status === "sent" || q.status === "viewed";
  const chosen = q.options.find((o) => o.id === q.accepted_option_id);

  return (
    <main style={s.page} data-testid="quote-page">
      <h1 style={s.h1}>{q.title}</h1>
      <p style={{ ...s.p, fontSize: 14 }}>Quote {q.quote_number}{q.expires_on ? ` · valid until ${q.expires_on}` : ""}</p>
      {q.message ? <p style={s.p}>{q.message}</p> : null}
      {q.status === "accepted" && chosen ? <p style={s.ok} data-testid="quote-done">Thank you. You chose {chosen.lender_name}. Your advisor will be in touch with the lender's documents to sign.</p> : null}
      {q.status === "declined" ? <p style={s.p} data-testid="quote-done">You declined this quote. Your advisor will be in touch.</p> : null}
      {q.status === "expired" ? <p style={s.p} data-testid="quote-done">This quote has expired. Your advisor can send you a new one.</p> : null}
      {q.status === "withdrawn" ? <p style={s.p} data-testid="quote-done">This quote was withdrawn. Your advisor will send you an updated one.</p> : null}
      {q.options.map((o, i) => (
        <section key={o.id} style={s.card(pick === o.id || q.accepted_option_id === o.id)} data-testid={`quote-option-${i}`}>
          <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>
            {open ? <label style={{ cursor: "pointer" }}><input type="radio" name="option" value={o.id} checked={pick === o.id} onChange={() => setPick(o.id)} style={{ width: 20, height: 20, marginRight: 8, verticalAlign: "middle" }} />{o.lender_name}</label> : o.lender_name}
            {o.product_name ? <span style={{ fontWeight: 400 }}> · {o.product_name}</span> : null}
            {o.recommended ? <span style={s.badge}>Recommended</span> : null}
          </h2>
          <div style={s.row}><span style={s.k}>Amount</span><strong>{money(o.amount, q.currency)}</strong></div>
          <div style={s.row}><span style={s.k}>Term</span><span>{term(o.term_months)}</span></div>
          <div style={s.row}><span style={s.k}>{o.rate_kind === "factor_rate" ? "Factor rate" : "Interest rate"}</span><span>{o.rate === null ? "-" : o.rate_kind === "factor_rate" ? o.rate.toFixed(2) : `${o.rate.toFixed(2)}% a year`}</span></div>
          <div style={s.row}><span style={s.k}>Payment</span><strong>{money(o.payment_amount, q.currency)} {FREQ[o.payment_frequency] ?? ""}{o.payment_count ? ` (${o.payment_count} payments)` : ""}</strong></div>
          {o.fees.map((f, k) => <div key={k} style={s.row}><span style={s.k}>{f.label}{f.deducted ? " (taken from the funds)" : ""}</span><span>{money(f.amount, q.currency)}</span></div>)}
          {(o.tax_lines ?? []).map((t, k) => <div key={`tax-${k}`} style={s.row} data-testid="quote-tax-line"><span style={s.k}>Sales tax on fees ({t.label})</span><span>{money(t.amount, q.currency)}</span></div>)}
          <div style={s.row}><span style={s.k}>Funds you receive</span><span>{money(o.net_proceeds, q.currency)}</span></div>
          <div style={s.row}><span style={s.k}>Total you repay</span><span>{money(o.total_repayment, q.currency)}</span></div>
          <div style={s.row}><span style={s.k}>Total cost of borrowing</span><strong>{money(o.cost_of_borrowing, q.currency)}</strong></div>
          {o.estimated_apr !== null ? <div style={s.row}><span style={s.k}>Estimated APR</span><span>{o.estimated_apr.toFixed(2)}%</span></div> : null}
          {o.notes ? <p style={{ ...s.p, fontSize: 14, marginTop: 8 }}>{o.notes}</p> : null}
        </section>
      ))}
      <p style={{ ...s.p, fontSize: 13, marginTop: 14 }}>Total cost of borrowing is everything you repay plus every fee, less the amount you borrow. Each lender's own agreement sets the final terms.</p>
      <button type="button" style={s.ghost} onClick={() => void openPdf()}>Open the PDF</button>
      {error ? <p role="alert" style={s.err}>{error}</p> : null}
      {open && !declining ? (
        <section style={{ ...s.card(false), marginTop: 18 }}>
          <label htmlFor="quote-name" style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Type your full name</label>
          <input id="quote-name" style={s.input} value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 12, fontSize: 15, color: "#374151" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2 }} />
            I accept the option I chose, and I understand the lender's own agreement will set the final terms.
          </label>
          <div style={{ marginTop: 14 }}>
            <button type="button" style={s.btn} disabled={busy} onClick={() => void accept()}>Accept this option</button>
            <button type="button" style={s.ghost} onClick={() => setDeclining(true)}>None of these work for me</button>
          </div>
        </section>
      ) : null}
      {open && declining ? (
        <section style={{ ...s.card(false), marginTop: 18 }}>
          <label htmlFor="quote-reason" style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Tell us why (optional)</label>
          <textarea id="quote-reason" style={{ ...s.input, minHeight: 80 }} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" style={{ ...s.btn, marginTop: 12 }} disabled={busy} onClick={() => void decline()}>Decline the quote</button>
          <button type="button" style={s.ghost} onClick={() => setDeclining(false)}>Back</button>
        </section>
      ) : null}
      <button type="button" style={s.ghost} onClick={() => navigate(-1)}>Back to my application</button>
    </main>
  );
}
