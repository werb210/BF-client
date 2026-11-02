// BF_CLIENT_v872_KYC - "Verify your identity" (/verify/:applicationId). Reached from the client-portal button
// (cta_action id_verify), the text/push link, or straight after submitting when Boreal turned the wizard step on
// (?wizard=1). Two ways, decided by the server:
//   hosted  the ID-check service's own secure page (photo of the ID + a selfie). On the web the page opens here and
//           comes back to /verify/... when done; in the phone apps it opens in the in-app browser.
//   upload  manual review: a photo of the front (and back) of the ID and a selfie, sent to Boreal's staff.
// No ID number, date of birth or picture is kept in the app; uploads go straight to the server.
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { apiCall } from "@/api/client";
import { getToken } from "@/auth/token";
import { ENV } from "@/env";
import { openExternal } from "@/native/openExternal";
import { A11Y_COLORS } from "@/styles/a11yColors";

type KycStatus = "requested" | "in_progress" | "processing" | "approved" | "declined" | "review" | "expired" | "cancelled" | "error";
type Verification = { id: string; application_id: string; status: KycStatus; mode: "hosted" | "upload"; requested_at: string | null; completed_at: string | null };
type Mine = { ok: boolean; enabled: boolean; wizard_step: boolean; verifications: Verification[] };

const OPEN = new Set<KycStatus>(["requested", "in_progress", "processing"]);
const DONE_TEXT: Partial<Record<KycStatus, string>> = {
  approved: "Thank you. Your identity is verified.",
  review: "Thank you. We have what we need and a member of our team is reviewing it.",
  declined: "We could not verify your identity from these pictures. Your advisor will be in touch about what to do next.",
  processing: "Thank you. We are checking your pictures now; this usually takes a minute or two.",
  expired: "This verification link ran out. Your advisor can send you a new one.",
};

const s = {
  page: { maxWidth: 560, margin: "0 auto", padding: "24px 16px 48px", color: "#0B1F3A" } as const,
  h1: { fontSize: 24, fontWeight: 700, margin: "0 0 8px" } as const,
  p: { fontSize: 16, lineHeight: 1.5, color: "#374151", margin: "0 0 12px" } as const,
  card: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginTop: 16, background: "#ffffff" } as const,
  btn: { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 48, padding: "12px 20px", borderRadius: 10, border: "none", background: A11Y_COLORS.actionBg, color: "#ffffff", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%" } as const,
  ghost: { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, padding: "10px 16px", borderRadius: 10, border: "1px solid #d1d5db", background: "#ffffff", color: "#0B1F3A", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 10 } as const,
  label: { display: "block", fontWeight: 600, fontSize: 15, margin: "14px 0 6px" } as const,
  ok: { color: A11Y_COLORS.successText, fontWeight: 600 } as const,
  err: { color: "#b91c1c", fontSize: 15, marginTop: 10 } as const,
  list: { fontSize: 15, lineHeight: 1.6, color: "#374151", paddingLeft: 20, margin: "8px 0 0" } as const,
};

function apiBase(): string {
  return ENV.API_BASE;
}

export default function VerifyIdentityPage() {
  const { applicationId = "" } = useParams<{ applicationId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const wizard = params.get("wizard") === "1";
  const [mine, setMine] = useState<Mine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<{ id_front?: File; id_back?: File; selfie?: File }>({});
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiCall<Mine>(`/api/client/kyc/applications/${encodeURIComponent(applicationId)}${wizard ? "?wizard=1" : ""}`);
      setMine(r);
      setError(null);
    } catch {
      setError("We could not load your verification. Please check your connection and try again.");
    }
  }, [applicationId, wizard]);
  useEffect(() => { void load(); }, [load]);

  // While a hosted check is underway, look again every few seconds (the result arrives by webhook).
  const current = mine?.verifications.find((v) => OPEN.has(v.status)) ?? mine?.verifications[0] ?? null;
  useEffect(() => {
    if (!current || !(current.status === "in_progress" || current.status === "processing") || current.mode !== "hosted") return;
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [current, load]);

  const goPortal = () => navigate(`/application/${encodeURIComponent(applicationId)}`, { replace: true });

  const start = async (v: Verification) => {
    setBusy(true);
    setError(null);
    try {
      const r = await apiCall<{ ok: boolean; mode: string; url?: string }>(`/api/client/kyc/verifications/${encodeURIComponent(v.id)}/start`, { method: "POST" });
      if (r.mode === "hosted" && r.url) {
        if (Capacitor.isNativePlatform()) { await openExternal(r.url); await load(); }
        else window.location.assign(r.url);
      } else {
        await load();
      }
    } catch {
      setError("The verification service did not answer. Please try again in a minute.");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (v: Verification) => {
    if (!files.id_front || !files.selfie) { setError("Please add a photo of the front of your ID and a selfie."); return; }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("id_front", files.id_front);
      if (files.id_back) form.append("id_back", files.id_back);
      form.append("selfie", files.selfie);
      const res = await fetch(`${apiBase()}/api/client/kyc/verifications/${encodeURIComponent(v.id)}/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken() ?? ""}` }, body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body?.message || "We could not send your pictures. Please try again."); return; }
      setSent(true);
      setFiles({});
      await load();
    } catch {
      setError("We could not send your pictures. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const pick = (key: "id_front" | "id_back" | "selfie") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFiles((cur) => ({ ...cur, [key]: f }));
  };

  if (!mine && !error) return <main style={s.page}><p style={s.p}>Loading…</p></main>;

  return (
    <main style={s.page} data-testid="verify-page">
      <h1 style={s.h1}>Verify your identity</h1>
      {error ? <p role="alert" style={s.err}>{error}</p> : null}
      {mine && (!mine.enabled || !current) ? (
        <>
          <p style={s.p}>{wizard ? "Your application is in. There is nothing else to do here right now." : "There is no identity check waiting for you right now."}</p>
          <button type="button" style={s.btn} onClick={goPortal}>Go to my application</button>
        </>
      ) : null}
      {current && !OPEN.has(current.status) ? (
        <>
          <p style={current.status === "approved" ? { ...s.p, ...s.ok } : s.p} data-testid="verify-done">{DONE_TEXT[current.status] ?? "Thank you."}</p>
          <button type="button" style={s.btn} onClick={goPortal}>Go to my application</button>
        </>
      ) : null}
      {current && OPEN.has(current.status) && current.mode === "hosted" ? (
        <section style={s.card}>
          {current.status === "processing" ? (
            <p style={s.p} data-testid="verify-done">{DONE_TEXT.processing}</p>
          ) : (
            <>
              <p style={s.p}>It takes about two minutes. You will need:</p>
              <ul style={s.list}>
                <li>Your driver's licence, provincial or state photo ID, or passport</li>
                <li>Good light, and your phone's camera for a short selfie</li>
              </ul>
              <p style={{ ...s.p, marginTop: 12 }}>Our secure ID-check partner takes the pictures and checks them. Your pictures are kept with your application and never shared with anyone else.</p>
              <button type="button" style={s.btn} disabled={busy} onClick={() => void start(current)}>{current.status === "in_progress" ? "Continue verifying" : "Start"}</button>
            </>
          )}
          <button type="button" style={s.ghost} onClick={goPortal}>{wizard ? "Do this later" : "Back to my application"}</button>
        </section>
      ) : null}
      {current && OPEN.has(current.status) && current.mode === "upload" ? (
        <section style={s.card}>
          {sent ? <p style={{ ...s.p, ...s.ok }}>Sent. Thank you.</p> : null}
          <p style={s.p}>Add a clear photo of your government photo ID and a selfie. A member of our team compares them.</p>
          <label style={s.label} htmlFor="kyc-front">Front of your ID</label>
          <input id="kyc-front" type="file" accept="image/*" capture="environment" onChange={pick("id_front")} />
          <label style={s.label} htmlFor="kyc-back">Back of your ID (if it has one)</label>
          <input id="kyc-back" type="file" accept="image/*" capture="environment" onChange={pick("id_back")} />
          <label style={s.label} htmlFor="kyc-selfie">A selfie</label>
          <input id="kyc-selfie" type="file" accept="image/*" capture="user" onChange={pick("selfie")} />
          <div style={{ marginTop: 16 }}>
            <button type="button" style={s.btn} disabled={busy} onClick={() => void upload(current)}>{busy ? "Sending…" : "Send"}</button>
            <button type="button" style={s.ghost} onClick={goPortal}>{wizard ? "Do this later" : "Back to my application"}</button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
