// BF_CLIENT_v869_SETTINGS_PACK_NPS - /survey/<token>: the post-funding question (0-10) and a comment. A 9 or 10 is
// offered Boreal's Google review link when it has one. BF-Server /api/surveys/r/:token.
import { useEffect, useState, type CSSProperties } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useBrand } from "./borealBrand";
import { publicApi } from "./publicApi";

type Survey = { company: string; question: string; comment_prompt: string; answered: boolean; score: number | null };
const NAVY = "#0B1F3A";
const page: CSSProperties = { maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px", color: "#111827", fontSize: 16, lineHeight: 1.5 };

export default function SurveyPage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const brand = useBrand();
  const accent = /^#[0-9a-f]{6}$/i.test(brand.primary_color) ? brand.primary_color : NAVY;
  const [s, setS] = useState<Survey | null>(null);
  const preset = Number(params.get("score"));
  const [score, setScore] = useState<number | null>(Number.isInteger(preset) && preset >= 0 && preset <= 10 ? preset : null);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ review_url: string | null } | null>(null);
  useEffect(() => {
    void publicApi<Survey>(`/api/surveys/r/${encodeURIComponent(token)}`).then(setS).catch((e) => setErr(e?.status === 404 ? "This survey link isn't valid." : "Please try again later."));
  }, [token]);
  const send = async () => {
    if (score === null) return setErr("Pick a number from 0 to 10.");
    setErr(null);
    try { setDone(await publicApi<{ review_url: string | null }>(`/api/surveys/r/${encodeURIComponent(token)}`, { method: "POST", body: { score, comment } })); }
    catch (e: any) { setErr(e?.message ?? "Could not send your answer."); }
  };
  if (done) {
    return (
      <main style={page} data-testid="survey-done">
        <h1 style={{ color: NAVY, fontSize: 24 }}>Thank you!</h1>
        <p>Your answer helps {s?.company ?? brand.company_name} do better.</p>
        {done.review_url && <>
          <p>Glad it went well. Would you share that in a quick Google review?</p>
          <a href={done.review_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "12px 18px", borderRadius: 12, background: accent, color: "#ffffff", fontWeight: 600, textDecoration: "none" }}>Leave a Google review</a>
        </>}
      </main>
    );
  }
  if (!s) return <main style={page}>{err ? <div role="alert" style={{ background: "#FEE2E2", color: "#7F1D1D", padding: 10, borderRadius: 10 }}>{err}</div> : <p>Loading...</p>}</main>;
  return (
    <main style={page} data-testid="survey-page">
      <div style={{ fontWeight: 700, color: NAVY }}>{s.company}</div>
      <h1 style={{ color: NAVY, fontSize: 22 }}>{s.question}</h1>
      <div role="radiogroup" aria-label="Score from 0 to 10" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" role="radio" aria-checked={score === n} onClick={() => setScore(n)}
            style={{ width: 44, height: 44, borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", border: `2px solid ${accent}`, background: score === n ? accent : "#ffffff", color: score === n ? "#ffffff" : NAVY }}>{n}</button>
        ))}
      </div>
      <p style={{ fontSize: 15, color: "#374151" }}>0 = not at all likely, 10 = extremely likely</p>
      <label htmlFor="sv-comment" style={{ display: "block", fontWeight: 600, margin: "12px 0 4px" }}>{s.comment_prompt}</label>
      <textarea id="sv-comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 10, border: "1px solid #94A3B8", fontSize: 16, color: "#111827" }} />
      {err ? <div role="alert" style={{ background: "#FEE2E2", color: "#7F1D1D", padding: 10, borderRadius: 10, marginTop: 8 }}>{err}</div> : null}
      <button type="button" onClick={() => void send()} style={{ marginTop: 12, minHeight: 48, padding: "0 18px", borderRadius: 12, border: 0, background: accent, color: "#ffffff", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Send</button>
    </main>
  );
}
