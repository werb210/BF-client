// BF_CLIENT_FEE_AGREEMENT_v709
// The applicant signs Boreal's media fee agreement (2% on funding) in the
// client mini-portal. The server decides whether one is owed and who signs;
// this window opens the embedded SignNow link and, when the signer finishes or
// closes it, asks the server to confirm with SignNow (never trusted from here).
import { useCallback, useEffect, useState } from "react";
import { apiCall } from "../api/client";

type Session = { status: string; url?: string; signerName?: string | null; reason?: string };

type Props = {
  applicationId: string;
  open: boolean;
  onClose: () => void;
  onSigned: () => void;
};

// BF_CLIENT_FEE_REASON_v724
export function feeReasonText(reason: string): string {
  if (reason === "signer_email_missing") return "we don't have an email address for the person signing";
  if (reason === "application_not_found") return "we couldn't find this application";
  return reason.replace(/^session_failed: ?/, "") || reason;
}

export default function FeeAgreementSignModal({ applicationId, open, onClose, onSigned }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !applicationId) return;
    let cancelled = false;
    setLoading(true);
    setSession(null);
    apiCall<Session>("/api/client/fee-agreement/session?applicationId=" + encodeURIComponent(applicationId))
      .then((r) => { if (!cancelled) setSession({ status: String(r?.status ?? "error"), url: typeof r?.url === "string" ? r.url : undefined, signerName: r?.signerName ?? null, reason: r?.reason }); })
      .catch(() => { if (!cancelled) setSession({ status: "error" }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, applicationId]);

  const confirm = useCallback(async () => {
    if (!applicationId) return;
    try {
      const r = await apiCall<{ signed?: boolean }>("/api/client/fee-agreement/complete?applicationId=" + encodeURIComponent(applicationId), { method: "POST" });
      if (r?.signed) onSigned();
    } catch { /* transient; the next trigger retries */ }
  }, [applicationId, onSigned]);

  useEffect(() => {
    if (!open || session?.status !== "ready") return;
    const onMsg = (ev: MessageEvent) => {
      const d = typeof ev.data === "string" ? ev.data : (ev.data && typeof ev.data === "object" ? JSON.stringify(ev.data) : "");
      if (/finish|complete|signed|document_signed/i.test(d)) void confirm();
    };
    window.addEventListener("message", onMsg);
    const t = window.setInterval(() => { void confirm(); }, 15000);
    return () => { window.removeEventListener("message", onMsg); window.clearInterval(t); };
  }, [open, session?.status, confirm]);

  if (!open) return null;
  const close = () => { onClose(); void confirm(); };

  return (
    <div role="dialog" aria-modal="true" aria-label="Sign your fee agreement" onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "#fff", color: "#0b1320", borderRadius: 12, maxWidth: 900, width: "100%", height: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Sign Your Fee Agreement</div>
          <button type="button" onClick={close} aria-label="Close" style={{ background: "transparent", border: 0, fontSize: 24, cursor: "pointer", color: "#334155", lineHeight: 1 }}>&times;</button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {loading && <div style={{ padding: 24 }}>Loading...</div>}
          {session?.status === "ready" && session.url && (
            <iframe title="Sign your fee agreement" src={session.url} style={{ border: 0, width: "100%", height: "100%" }} />
          )}
          {session?.status === "signed" && <div style={{ padding: 24 }}>Your fee agreement is signed. Thank you!</div>}
          {session?.status === "other_signer" && (
            <div style={{ padding: 24 }}>This agreement is signed by {session.signerName || "a director of your company"}. We have emailed them a link to sign.</div>
          )}
          {session?.status === "none" && <div style={{ padding: 24 }}>There is no fee agreement to sign on this application.</div>}
          {session?.status === "stub" && <div style={{ padding: 24 }}>Signing isn't enabled in this environment yet.</div>}
          {/* BF_CLIENT_FEE_REASON_v724 - say why, so the client (and staff on the phone) know what to fix. */}
          {session?.status === "error" && <div style={{ padding: 24 }}>We couldn't load your agreement. Please try again shortly, or call us at (866) 631-8939.{session.reason ? <div style={{ marginTop: 10, fontSize: 13, color: "#51617D" }}>Reason: {feeReasonText(session.reason)}</div> : null}</div>}
        </div>
      </div>
    </div>
  );
}
