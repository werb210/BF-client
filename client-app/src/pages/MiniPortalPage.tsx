import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApplicationStore } from "@/state/useApplicationStore";
import { apiCall } from "@/api/client";
import { ENV } from "@/env";
import { getToken } from "@/auth/token";
import MessageThread, { type ThreadMessage } from "@/components/messaging/MessageThread";
// BF_CLIENT_BLOCK_53_v1
import DocPicker from "@/components/DocPicker";
import { Device } from "@twilio/voice-sdk";
import "./MiniPortalPage.css";
import PersonalNetWorthForm from "@/pages/mini-portal/forms/forms/PersonalNetWorthForm";
import DebtStackForm from "@/pages/mini-portal/forms/forms/DebtStackForm";
import SlimHeader from "@/components/SlimHeader";

const STAGES = [
  { key: "received", label: "Received" },
  { key: "documents_required", label: "Documents Required" },
  { key: "in_review", label: "In Review" },
  { key: "additional_steps_required", label: "Additional Steps Required" },
  { key: "off_to_lender", label: "Off to Lender" },
  { key: "offer", label: "Offer" },
] as const;
type StageKey = (typeof STAGES)[number]["key"];
const STAGE_BY_KEY: Record<string, number> = STAGES.reduce((acc, s, i) => ({ ...acc, [s.key]: i }), {} as Record<string, number>);

type ServerOffer = { id: string; lender_name?: string; lender_logo_url?: string | null; amount?: string | number | null; rate_factor?: string | null; term?: string | null; payment_frequency?: string | null; expiry_date?: string | null; document_url?: string | null; status?: string; recommended?: boolean };
type Offer = { id: string; lenderName: string; lenderLogoUrl?: string; amount?: string; rateOrFactor?: string; term?: string; paymentFrequency?: string; expiresAt?: string; pdfUrl?: string; status?: string; recommended?: boolean };
const normalizeOffer = (s: ServerOffer): Offer => ({ id: s.id, lenderName: s.lender_name ?? "Unknown lender", lenderLogoUrl: s.lender_logo_url ?? undefined, amount: s.amount == null ? undefined : String(s.amount), rateOrFactor: s.rate_factor ?? undefined, term: s.term ?? undefined, paymentFrequency: s.payment_frequency ?? undefined, expiresAt: s.expiry_date ?? undefined, pdfUrl: s.document_url ?? undefined, status: s.status, recommended: Boolean(s.recommended) });
function expirationColor(expiresAt?: string): "ok" | "warn" | "danger" { if (!expiresAt) return "ok"; const t = new Date(expiresAt).getTime(); if (Number.isNaN(t)) return "ok"; const diffDays = (t - Date.now()) / 86_400_000; if (diffDays <= 2) return "danger"; if (diffDays <= 4) return "warn"; return "ok"; }
// BF_CLIENT_BLOCK_53_v1 -- final 7-pill spec. Media dropped per
// product decision (2026-05-17). Upload Documents is the first pill
// and opens DocPicker, not the file input.
const ACTION_CHIPS = [
  { id: "upload",     label: "Upload Documents" },
  { id: "new",        label: "New Application" },
  { id: "networth",   label: "Personal Net Worth" },
  { id: "equipment",  label: "Equipment Collateral Form" },
  { id: "realestate", label: "Real Estate Collateral Form" },
  { id: "debt",       label: "Debt Schedule" },
  { id: "other",      label: "Other Forms" },
] as const;

export default function MiniPortalPage() {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { app, reset } = useApplicationStore();
  const applicationId = routeId || searchParams.get("applicationId") || app.applicationId || app.applicationToken || "";
  const [messages, setMessages] = useState<ThreadMessage[]>([]); const [text, setText] = useState(""); const [stageIndex, setStageIndex] = useState(0); const [percent, setPercent] = useState(0); const [offers, setOffers] = useState<Offer[]>([]); const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);
  // BF_CLIENT_BLOCK_v162_MINI_PORTAL_REJECTED_DOCS_BANNER_v1
  type RejectedDoc = { id: string; category: string | null; filename: string | null; rejection_reason: string | null; updated_at: string | null };
  const [rejectedDocs, setRejectedDocs] = useState<RejectedDoc[]>([]);



  useEffect(() => { if (!applicationId) return; let active = true; async function loadAll() {
    try { const appData = await apiCall<any>(`/api/applications/${encodeURIComponent(applicationId)}`); if (!active) return; const raw = String(appData?.data?.pipeline_state ?? appData?.data?.stage ?? appData?.pipeline_state ?? appData?.stage ?? "").toLowerCase().replace(/\s+/g, "_"); if (raw in STAGE_BY_KEY) setStageIndex(STAGE_BY_KEY[raw as StageKey]); const p = appData?.data?.completion_pct ?? appData?.completion_pct ?? null; if (typeof p === "number" && p >= 0 && p <= 100) setPercent(Math.round(p)); } catch {}
    try {
      const incoming = await apiCall<any[]>(`/api/client/messages?applicationId=${encodeURIComponent(applicationId)}`).catch((): any[] => []);
      if (!active) return;
      setMessages(incoming.map((item: any, idx: number) => {
        const dir = String(item.direction ?? "").toLowerCase();
        const role: "self" | "other" = dir === "inbound" ? "self" : "other";
        return {
          id: String(item.id || idx),
          authorRole: role,
          authorName: item.authorName ?? (role === "self" ? "You" : "Boreal"),
          body: String(item.body ?? item.content ?? ""),
          createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
          ctaLabel: typeof item.cta_label === "string" ? item.cta_label : (typeof item.ctaLabel === "string" ? item.ctaLabel : null),
          ctaAction: typeof item.cta_action === "string" ? item.cta_action : (typeof item.ctaAction === "string" ? item.ctaAction : null),
        };
      }));
    } catch {}
    try { const offerData = await apiCall<{ items?: ServerOffer[]; data?: ServerOffer[] } | ServerOffer[]>(`/api/offers?applicationId=${encodeURIComponent(applicationId)}`).catch((): null => null); if (!active) return; const incoming: ServerOffer[] = Array.isArray(offerData) ? offerData : Array.isArray((offerData as any)?.items) ? (offerData as any).items : Array.isArray((offerData as any)?.data) ? (offerData as any).data : []; setOffers(incoming.map(normalizeOffer)); } catch {}
    // BF_CLIENT_BLOCK_v162_MINI_PORTAL_REJECTED_DOCS_BANNER_v1
    try {
      const docsResp = await apiCall<any>(`/api/applications/${encodeURIComponent(applicationId)}/documents`).catch((): any => null);
      if (!active) return;
      const items: any[] = Array.isArray(docsResp) ? docsResp
        : Array.isArray(docsResp?.items) ? docsResp.items
        : Array.isArray(docsResp?.data) ? docsResp.data
        : Array.isArray(docsResp?.documents) ? docsResp.documents
        : [];
      const rejected: RejectedDoc[] = items
        .filter((d: any) => String(d?.status ?? "").toLowerCase() === "rejected")
        .map((d: any) => ({
          id: String(d.id ?? d.documentId ?? ""),
          category: typeof d.category === "string" ? d.category : (typeof d.document_type === "string" ? d.document_type : null),
          filename: typeof d.filename === "string" ? d.filename : (typeof d.title === "string" ? d.title : null),
          rejection_reason: typeof d.rejection_reason === "string" ? d.rejection_reason : (typeof d.rejectionReason === "string" ? d.rejectionReason : null),
          updated_at: typeof d.updated_at === "string" ? d.updated_at : (typeof d.updatedAt === "string" ? d.updatedAt : null),
        }))
        .filter((d) => d.id.length > 0);
      setRejectedDocs(rejected);
    } catch {}
  }
  void loadAll(); const poll = setInterval(() => { if (document.visibilityState === "visible") void loadAll(); }, 20000); return () => { active = false; clearInterval(poll); }; }, [applicationId]);


  const onMessageCta = useCallback((action: string) => {
    if (!action) return;
    const [kind, rest] = action.split(":", 2);
    if (kind === "upload" && rest) {
      setShowDocPicker(true);
      return;
    }
    if (kind === "form" && rest) {
      navigate(`/forms/${rest}?applicationId=${encodeURIComponent(applicationId)}`);
      return;
    }
    if (kind === "message" && rest) {
      setText(rest);
    }
  }, [applicationId, navigate]);

  // BF_CLIENT_BLOCK_53_v1 -- "upload" opens the DocPicker modal,
  // not a single-file native picker.
  const [showDocPicker, setShowDocPicker] = useState(false);
  // BF_CLIENT_BLOCK_v315_MINI_PORTAL_FORM_MODALS_v1
  const [openForm, setOpenForm] = useState<null | "networth" | "debt" | "equipment" | "realestate" | "other">(null);
  // BF_CLIENT_BLOCK_v315_MINI_PORTAL_FORM_MODALS_v1 — PNW + Debt
  // open as modals (real forms); equipment/realestate/other open a
  // "coming soon" modal. The legacy /forms/* route doesn't exist
  // and was scrolling-to-top silently.
  const onChip = (id: string) => {
    if (id === "new") { reset(); navigate("/apply/step-1"); return; }
    if (id === "upload") { setShowDocPicker(true); return; }
    if (id === "networth" || id === "debt" || id === "equipment" || id === "realestate" || id === "other") {
      setOpenForm(id);
      return;
    }
  };

  // Call Us! VOIP state + handlers.
  const [callState, setCallState] = useState<"idle" | "connecting" | "ringing" | "connected" | "ended" | "failed">("idle");
  const [callError, setCallError] = useState<string | null>(null);
  const callDeviceRef = useState<Device | null>(null)[0]; void callDeviceRef; // placeholder to keep types compact
  const callRefHolder = useMemo(() => ({ device: null as Device | null, call: null as any }), []);

  async function startCall() {
    if (!applicationId) return;
    setCallError(null);
    setCallState("connecting");
    try {
      const r = await fetch(`/api/client/voice/token`, { credentials: "include" });
      if (!r.ok) throw new Error("token fetch failed");
      const tokenResp = await r.json();
      if (!tokenResp?.agents_available) { setCallState("idle"); alert("No advisors are available right now. We'll text you back within 30 minutes — please send us a message in the chat below describing what you need."); return; }
      if (!tokenResp?.token) throw new Error("No token");
      if (!callRefHolder.device) {
        callRefHolder.device = new Device(tokenResp.token, { logLevel: "warn" } as any);
        await (callRefHolder.device as any).register?.();
      }
      const call = await callRefHolder.device.connect({ params: { To: "staff" } });
      callRefHolder.call = call;
      call.on("ringing", () => setCallState("ringing"));
      call.on("accept", () => setCallState("connected"));
      call.on("disconnect", () => setCallState("ended"));
      call.on("cancel", () => setCallState("ended"));
      call.on("error", (e: Error) => { setCallError(e.message); setCallState("failed"); });
    } catch (e: any) {
      setCallError(e?.message ?? "Couldn't reach staff");
      setCallState("failed");
    }
  }

  function endCall() {
    callRefHolder.call?.disconnect?.();
    callRefHolder.call = null;
    setCallState("idle");
  }
  const onHashtagClick = (tag: string) => { const id = tag.replace(/^#/, ""); const chip = ACTION_CHIPS.find((c) => c.id === id); if (chip) onChip(chip.id); else navigate(`/forms/${id}?applicationId=${encodeURIComponent(applicationId)}`); };
  async function acceptOffer(offerId: string) { await apiCall(`/api/offers/${encodeURIComponent(offerId)}/accept`, { method: "POST" }); setPendingOfferId(offerId); setOffers((cur) => cur.map((o) => (o.id === offerId ? { ...o, status: "pending_acceptance" } : o))); }
  async function requestChanges(offerId: string) { const reason = typeof window !== "undefined" ? window.prompt("What changes would you like to request?") : ""; if (reason === null) return; await apiCall(`/api/offers/${encodeURIComponent(offerId)}/decline`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) }); setOffers((cur) => cur.map((o) => (o.id === offerId ? { ...o, status: "changes_requested" } : o))); }
  async function sendMessage() { if (!text.trim() || !applicationId) return; const next = text.trim(); setText(""); await apiCall("/api/client/messages", { method: "POST", body: { applicationId, body: next, direction: "inbound" } }); setMessages((prev) => [...prev, { id: `local-${Date.now()}`, authorRole: "self", authorName: "You", body: next, createdAt: new Date().toISOString() }]); }

  const stageRow = useMemo(() => STAGES.map((s, i) => ({ ...s, completed: i < stageIndex, current: i === stageIndex })), [stageIndex]);
  const showOfferView = stageIndex === STAGE_BY_KEY.offer;

  const currentStageLabel = STAGES[stageIndex]?.label ?? "";
  const shortId = applicationId
    ? applicationId.length > 8
      ? applicationId.slice(-8).toUpperCase()
      : applicationId.toUpperCase()
    : "";

  return (
    <div className="mp-root">
      <SlimHeader />
      {/* BF_CLIENT_BLOCK_v162_MINI_PORTAL_REJECTED_DOCS_BANNER_v1 */}
      {rejectedDocs.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", margin: "0 0 12px", color: "#7f1d1d" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>⚠ {rejectedDocs.length} document{rejectedDocs.length === 1 ? " was" : "s were"} rejected — please re-upload</div>
          <ul style={{ margin: "6px 0 10px", paddingLeft: 20, fontSize: 13, lineHeight: 1.5 }}>
            {rejectedDocs.map((doc) => (
              <li key={doc.id}>
                {doc.category || "Document"}{doc.filename ? ` (${doc.filename})` : ""}{doc.rejection_reason ? `: ${doc.rejection_reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      <header className="mp-app-header">
        <div className="mp-app-header__left">
          <span className="mp-app-header__label">Application</span>
          <span className="mp-app-header__id">{shortId || "—"}</span>
        </div>
        <div className="mp-app-header__right">
          <span className="mp-app-header__stage-label">Stage</span>
          <span className="mp-app-header__stage-value">{currentStageLabel}</span>
        </div>
      </header>
      <div className="mp-tracker" role="list" aria-label="Application progress">{stageRow.map((s, i) => <div key={s.key} role="listitem" className={`mp-stage ${s.completed ? "mp-stage--done" : ""} ${s.current ? "mp-stage--current" : ""}`}><div className="mp-stage__bullet">{s.completed ? "✓" : i + 1}</div><div className="mp-stage__label">{s.label}</div>{s.current && percent > 0 ? <div className="mp-stage__pct">{percent}%</div> : null}</div>)}</div>
      <div className={`mp-grid ${showOfferView ? "mp-grid--offers" : ""}`}>
        <section className="mp-thread-card"><header className="mp-thread-card__header">Messages</header><div className="mp-thread-card__body"><MessageThread messages={messages} onHashtagClick={onHashtagClick} onCtaClick={onMessageCta} emptyText="Say hi to get started." /></div><div className="mp-thread-card__composer"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" onKeyDown={(e) => { if (e.key === "Enter") void sendMessage(); }} /><button onClick={() => void sendMessage()}>Send</button></div></section>
        {!showOfferView && (
          <aside className="mp-actions">
            {/* BF_CLIENT_BLOCK_53_v1 -- 7-pill 2-col grid; no per-doc cards. */}
            <div className="mp-actions__chips" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ACTION_CHIPS.map((c) => (
                <button key={c.id} type="button" className="mp-chip" onClick={() => onChip(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
            {/* Twilio Voice WebRTC, no tel: link */}
            <div style={{ marginTop: 12 }}>
              {callState === "idle" && (
                <button type="button" className="mp-callus" onClick={() => void startCall()} style={{ width: "100%", padding: 14, background: "#22c55e", color: "#fff", border: 0, borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                  📞 Call Us!
                </button>
              )}
              {(callState === "connecting" || callState === "ringing") && (
                <div style={{ width: "100%", padding: 12, background: "#fef3c7", color: "#78350f", borderRadius: 10, textAlign: "center", fontSize: 14 }}>
                  {callState === "connecting" ? "Connecting…" : "Ringing staff…"}
                  <button type="button" onClick={endCall} style={{ marginLeft: 12, padding: "4px 10px", border: 0, borderRadius: 6, background: "#ef4444", color: "#fff", cursor: "pointer" }}>Cancel</button>
                </div>
              )}
              {callState === "connected" && (
                <div style={{ width: "100%", padding: 12, background: "#dcfce7", color: "#14532d", borderRadius: 10, textAlign: "center", fontSize: 14 }}>
                  ✓ Connected
                  <button type="button" onClick={endCall} style={{ marginLeft: 12, padding: "4px 10px", border: 0, borderRadius: 6, background: "#ef4444", color: "#fff", cursor: "pointer" }}>End</button>
                </div>
              )}
              {callState === "ended" && (
                <button type="button" className="mp-callus" onClick={() => setCallState("idle")} style={{ width: "100%", padding: 14, background: "#22c55e", color: "#fff", border: 0, borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                  📞 Call Us!
                </button>
              )}
              {callState === "failed" && (
                <div style={{ width: "100%", padding: 12, background: "#fee2e2", color: "#7f1d1d", borderRadius: 10, fontSize: 13 }}>
                  {callError ?? "Call failed."} <button type="button" onClick={() => setCallState("idle")} style={{ marginLeft: 8, color: "#7f1d1d", background: "transparent", border: 0, textDecoration: "underline", cursor: "pointer" }}>Try again</button>
                </div>
              )}
            </div>
            {showDocPicker && (
              <DocPicker
                applicationId={applicationId}
                onClose={() => setShowDocPicker(false)}
                onUploaded={() => { /* polling will refresh rejected banner */ }}
              />
            )}
          </aside>
        )}
        {showOfferView && <section className="mp-offers">{offers.length === 0 ? <div className="mp-offers__empty">No offers yet.</div> : offers.map((o) => { const exp = expirationColor(o.expiresAt); return <article key={o.id} className={`mp-offer mp-offer--${exp}`}><header className="mp-offer__head"><strong>{o.lenderName}</strong>{o.recommended ? <span className="mp-offer__badge">Recommended</span> : null}</header>{o.lenderLogoUrl ? <img className="mp-offer__logo" src={o.lenderLogoUrl} alt={o.lenderName} /> : null}<div className="mp-offer__amount">{o.amount ? `$${o.amount}` : "—"}</div><dl className="mp-offer__meta"><dt>Rate / Factor</dt><dd>{o.rateOrFactor ?? "—"}</dd><dt>Term</dt><dd>{o.term ?? "—"}</dd><dt>Payment</dt><dd>{o.paymentFrequency ?? "—"}</dd><dt>Expiration</dt><dd>{o.expiresAt ?? "—"}</dd></dl>{o.status === "pending_acceptance" || pendingOfferId === o.id ? <div className="mp-offer__pending">✓ Sent for staff confirmation. We'll text you when it's ready to sign.</div> : <div className="mp-offer__actions">{o.pdfUrl ? <a href={o.pdfUrl} target="_blank" rel="noopener noreferrer" data-testid="view-pdf-link" className="mp-btn mp-btn--ghost">View PDF</a> : null}<button type="button" data-testid="request-changes-btn" className="mp-btn mp-btn--secondary" onClick={() => void requestChanges(o.id)}>Request Changes</button><button type="button" data-testid="accept-offer-btn" className="mp-btn mp-btn--primary" onClick={() => void acceptOffer(o.id)}>Accept</button></div>}</article>; })}</section>}
      {/* BF_CLIENT_BLOCK_v315_MINI_PORTAL_FORM_MODALS_v1 — form modals */}
      {openForm !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setOpenForm(null); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              color: "#0b1320",
              borderRadius: 12,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 0,
              boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                {openForm === "networth" && "Personal Net Worth"}
                {openForm === "debt" && "Debt Schedule"}
                {openForm === "equipment" && "Equipment Collateral Form"}
                {openForm === "realestate" && "Real Estate Collateral Form"}
                {openForm === "other" && "Other Forms"}
              </div>
              <button
                type="button"
                onClick={() => setOpenForm(null)}
                aria-label="Close"
                style={{ background: "transparent", border: 0, fontSize: 24, cursor: "pointer", color: "#64748b", lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: 20 }}>
              {openForm === "networth" && (
                <PersonalNetWorthForm
                  applicationId={applicationId}
                  onComplete={() => setOpenForm(null)}
                />
              )}
              {openForm === "debt" && (
                <DebtStackForm
                  applicationId={applicationId}
                  onComplete={() => setOpenForm(null)}
                />
              )}
              {(openForm === "equipment" || openForm === "realestate" || openForm === "other") && (
                <div style={{ textAlign: "center", padding: "32px 16px" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Coming soon</div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>
                    This form isn't built yet. If you need to submit this information now, please use the Upload Documents chip or message your contact.
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenForm(null)}
                    style={{ marginTop: 24, padding: "10px 20px", background: "#0b1320", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
