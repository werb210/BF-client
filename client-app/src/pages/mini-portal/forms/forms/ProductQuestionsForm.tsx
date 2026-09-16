// BF_CLIENT_PRODUCT_QUESTIONS_v290
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiCall } from "@/api/client";
import { MonthYearSelect } from "@/wizard/MonthYearSelect";

export type ProductQuestion = {
  id: string; key: string; label: string;
  type: "text" | "yesno" | "money" | "month" | "yearmonth" | "number" | "select";
  section: "business" | "owner" | "risk" | "equipment";
  required: boolean; options: string[] | null;
  showIf: { key: string; equals: string } | null;
  ownerIndex: number | null; ownerName: string | null; value: string;
};

type Payload = { set: string | null; setLabel: string | null; missing: string[]; submittedAt: string | null; questions: ProductQuestion[] };

export function dependencyId(q: ProductQuestion): string | null {
  if (!q.showIf) return null;
  const parts = q.id.split(".");
  parts[parts.length - 1] = q.showIf.key;
  return parts.join(".");
}

export function isVisible(q: ProductQuestion, answers: Record<string, string>): boolean {
  const dep = dependencyId(q);
  return !dep || answers[dep] === q.showIf!.equals;
}

export function stillMissing(questions: ProductQuestion[], answers: Record<string, string>): string[] {
  return questions.filter((q) => q.required && isVisible(q, answers) && !String(answers[q.id] ?? "").trim()).map((q) => q.id);
}

export function groupQuestions(questions: ProductQuestion[]): Array<{ title: string; items: ProductQuestion[] }> {
  const groups: Array<{ title: string; items: ProductQuestion[] }> = [];
  const add = (title: string, items: ProductQuestion[]) => { if (items.length) groups.push({ title, items }); };
  add("About the business", questions.filter((q) => q.section === "business"));
  add("Equipment", questions.filter((q) => q.section === "equipment"));
  add("Risk questions", questions.filter((q) => q.section === "risk"));
  const owners = Array.from(new Set(questions.filter((q) => q.section === "owner").map((q) => q.ownerIndex ?? 0))).sort();
  for (const idx of owners) {
    const items = questions.filter((q) => q.section === "owner" && (q.ownerIndex ?? 0) === idx);
    add(items[0]?.ownerName ? `About ${items[0].ownerName}` : `Owner ${idx + 1}`, items);
  }
  return groups;
}

const s = {
  h2: { fontSize: 22, fontWeight: 700, marginBottom: 6 } as const,
  intro: { fontSize: 14, color: "#4b5563", marginBottom: 16 } as const,
  group: { border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 14 } as const,
  groupTitle: { fontSize: 16, fontWeight: 700, marginBottom: 10 } as const,
  row: { marginBottom: 12 } as const,
  label: { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 } as const,
  input: { width: "100%", fontSize: 16, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", boxSizing: "border-box" as const },
  missing: { border: "1px solid #dc2626" } as const,
  yn: (on: boolean) => ({ minHeight: 44, minWidth: 80, borderRadius: 8, border: `1px solid ${on ? "#2563eb" : "#d1d5db"}`, background: on ? "#dbeafe" : "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer" }),
  actions: { display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" as const, marginTop: 8 } as const,
  primary: { minHeight: 48, padding: "0 20px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" } as const,
  secondary: { minHeight: 48, padding: "0 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#111827", fontSize: 16, fontWeight: 600, cursor: "pointer" } as const,
  error: { color: "#b91c1c", fontSize: 14, marginTop: 8 } as const,
  done: { color: "#065f46", fontSize: 15, padding: 16, background: "#ecfdf5", borderRadius: 8 } as const,
};

export default function ProductQuestionsForm({ applicationId, onComplete }: { applicationId: string; onComplete: () => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const base = `/api/client/applications/${encodeURIComponent(applicationId)}/product-questions`;

  const load = useCallback(async () => {
    try {
      const r = await apiCall<Payload>(base);
      setData(r);
      setAnswers(Object.fromEntries((r?.questions ?? []).map((q) => [q.id, q.value ?? ""])));
    } catch {
      setError("We couldn't load your questions. Please try again in a moment.");
    }
  }, [base]);

  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => (data?.questions ?? []).filter((q) => isVisible(q, answers)), [data, answers]);
  const groups = useMemo(() => groupQuestions(visible), [visible]);
  const payload = () => Object.fromEntries(visible.filter((q) => String(answers[q.id] ?? "").trim() !== "").map((q) => [q.id, answers[q.id]]));

  const save = async (submit: boolean) => {
    if (!data) return;
    setError(null);
    if (submit) {
      const missing = stillMissing(data.questions, answers);
      if (missing.length) {
        setHighlight(new Set(missing));
        setError(`Please answer the ${missing.length} highlighted question${missing.length === 1 ? "" : "s"}.`);
        return;
      }
    }
    setBusy(true);
    try {
      await apiCall(base, { method: "POST", body: { answers: payload(), submit } });
      if (submit) setDone(true); else onComplete();
    } catch {
      if (submit) {
        await load();
        setError("Some answers still need attention. Please check the highlighted questions.");
      } else setError("We couldn't save your answers. Please try again.");
    } finally { setBusy(false); }
  };

  if (done) return <div><h2 style={s.h2}>Thank you</h2><div style={s.done} data-testid="product-questions-done">Your answers are in. We'll send your application to lenders next.</div><div style={s.actions}><button type="button" style={s.primary} onClick={onComplete}>Close</button></div></div>;
  if (!data) return <div>{error ?? "Loading your questions…"}</div>;
  if (!data.set || data.questions.length === 0) return <div><h2 style={s.h2}>Nothing to answer</h2><p style={s.intro}>There are no extra questions for your application right now.</p><div style={s.actions}><button type="button" style={s.primary} onClick={onComplete}>Close</button></div></div>;

  const set = (id: string, value: string) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setHighlight((h) => { if (!h.has(id)) return h; const n = new Set(h); n.delete(id); return n; });
  };
  const field = (q: ProductQuestion) => {
    const value = answers[q.id] ?? "";
    const style = { ...s.input, ...(highlight.has(q.id) ? s.missing : {}) };
    let control;
    if (q.type === "yesno") control = <div role="radiogroup" aria-label={q.label} style={{ display: "flex", gap: 8 }}>{["Yes", "No"].map((o) => <button key={o} type="button" role="radio" aria-checked={value === o} style={{ ...s.yn(value === o), ...(highlight.has(q.id) && !value ? { border: "1px solid #dc2626" } : {}) }} onClick={() => set(q.id, o)}>{o}</button>)}</div>;
    else if (q.type === "select") control = <select aria-label={q.label} value={value} onChange={(e) => set(q.id, e.target.value)} style={style}><option value="">Select…</option>{(q.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}</select>;
    else if (q.type === "month" || q.type === "yearmonth") control = <MonthYearSelect ariaLabel={q.label} value={value} onChange={(v) => set(q.id, v)} monthOnly={q.type === "month"} yearsBack={q.type === "yearmonth" ? 80 : 5} yearsForward={q.type === "month" ? 5 : 0} />;
    else control = <input aria-label={q.label} inputMode={q.type === "money" || q.type === "number" ? "decimal" : undefined} placeholder={q.type === "money" ? "$" : undefined} value={value} onChange={(e) => set(q.id, e.target.value)} style={style} />;
    return <div key={q.id} style={s.row} data-question-id={q.id}><label style={s.label}>{q.label}{q.required ? " *" : ""}</label>{control}</div>;
  };

  return <div data-testid="product-questions-form">
    <h2 style={s.h2}>{data.setLabel} questions</h2>
    <p style={s.intro}>A few more details are needed before we can send your {data.setLabel} application to lenders. Questions marked * are required.</p>
    {groups.map((g) => <section key={g.title} style={s.group}><div style={s.groupTitle}>{g.title}</div>{g.items.map(field)}</section>)}
    {error && <div role="alert" style={s.error}>{error}</div>}
    <div style={s.actions}><button type="button" style={s.secondary} disabled={busy} onClick={() => void save(false)}>Save and finish later</button><button type="button" style={s.primary} disabled={busy} onClick={() => void save(true)}>{busy ? "Sending…" : "Submit answers"}</button></div>
  </div>;
}
