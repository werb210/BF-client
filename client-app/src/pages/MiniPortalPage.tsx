import { useEffect, useMemo, useState, useCallback } from "react";
// BF_CLIENT_BLOCK_44_v1 -- voice + per-doc uploads
import { useClientCall } from "@/telephony/hooks/useClientCall";
import { initializeVoice } from "@/telephony/voiceClient";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApplicationStore } from "@/state/useApplicationStore";
import { apiCall } from "@/api/client";
import { ENV } from "@/env";
import { getToken } from "@/auth/token";
import MessageThread, { type ThreadMessage } from "@/components/messaging/MessageThread";
import "./MiniPortalPage.css";

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
const ACTION_CHIPS = [{ id: "upload", label: "Upload Documents" }, { id: "new", label: "New Application" }, { id: "networth", label: "Personal Net Worth" }, { id: "equipment", label: "Equipment Collateral Form" }, { id: "realestate", label: "Real Estate Collateral Form" }, { id: "debt", label: "Debt Schedule" }, { id: "media", label: "Media Attachments" }, { id: "other", label: "Other Forms" }] as const;

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

  // BF_CLIENT_BLOCK_44_v1 -- voice device
  const { status: callStatus, startCall, hangup } = useClientCall();
  useEffect(() => {
    void initializeVoice("client").catch((err) => {
      console.warn("[mini-portal] voice init failed", err);
    });
  }, []);

  // BF_CLIENT_BLOCK_44_v1 -- per-doc required-docs list
  type RequiredDocEntry = { id: string; document_type: string; required: boolean; stage?: 1 | 2 };
  const [requiredDocsList, setRequiredDocsList] = useState<RequiredDocEntry[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
  const [activeUploadType, setActiveUploadType] = useState<string | null>(null);

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
  void loadAll(); const poll = setInterval(() => void loadAll(), 5000); return () => { active = false; clearInterval(poll); }; }, [applicationId]);

  // BF_CLIENT_BLOCK_44_v1 -- load per-doc required-docs union
  useEffect(() => {
    if (!applicationId) return;
    let active = true;
    void (async () => {
      try {
        const params = new URLSearchParams({ application_id: applicationId });
        const docsRes = await apiCall<any>(`/api/portal/lender-products/required-docs?${params.toString()}`).catch((): any => null);
        if (!active) return;
        const items: any[] = Array.isArray(docsRes) ? docsRes : Array.isArray(docsRes?.items) ? docsRes.items : [];
        const entries: RequiredDocEntry[] = items
          .filter((it) => it && typeof it.document_type === "string")
          .filter((it) => {
            const stage = typeof it.stage === "number" ? it.stage : 1;
            return stage === 1;
          })
          .map((it, idx) => ({
            id: String(it.id ?? `req-${idx}`),
            document_type: String(it.document_type),
            required: Boolean(it.required ?? true),
            stage: it.stage === 2 ? 2 : 1,
          }));
        setRequiredDocsList(entries);
      } catch {}
    })();
    return () => { active = false; };
  }, [applicationId]);

  const uploadDocumentTyped = useCallback(async (docType: string, file: File) => {
    if (!applicationId) return;
    setUploadingDoc((prev) => ({ ...prev, [docType]: true }));
    setUploadErrors((prev) => ({ ...prev, [docType]: null }));
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("applicationId", applicationId);
      form.append("category", docType);
      const res = await fetch(`${ENV.API_BASE}/api/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
        body: form,
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status}) ${msg}`);
      }
    } catch (err) {
      setUploadErrors((prev) => ({ ...prev, [docType]: err instanceof Error ? err.message : "Upload failed" }));
    } finally {
      setUploadingDoc((prev) => ({ ...prev, [docType]: false }));
    }
  }, [applicationId]);

  const onMessageCta = useCallback((action: string) => {
    if (!action) return;
    const [kind, rest] = action.split(":", 2);
    if (kind === "upload" && rest) {
      setActiveUploadType(rest);
      document.getElementById(`mp-doc-${rest}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
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

  // BF_CLIENT_BLOCK_44_v1 -- "upload" chip removed; per-doc list
  // replaces it. Branch kept defensively in case any stale link
  // routes here.
  const onChip = (id: string) => {
    if (id === "new") { reset(); navigate("/apply/step-1"); return; }
    if (id === "upload") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(`/forms/${id}?applicationId=${encodeURIComponent(applicationId)}`);
  };
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
            <div className="mp-actions__docs">
              {requiredDocsList.length === 0 ? (
                <div style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>
                  No documents currently required.
                </div>
              ) : requiredDocsList.map((entry) => {
                const docType = entry.document_type;
                const rejected = rejectedDocs.find((rd) => rd.category === docType);
                const isUploading = !!uploadingDoc[docType];
                const err = uploadErrors[docType];
                const status = rejected ? "rejected" : isUploading ? "uploading" : "ready";
                const isActive = activeUploadType === docType;
                return (
                  <div key={entry.id} id={`mp-doc-${docType}`} style={{ padding: 12, marginBottom: 8, borderRadius: 8, border: `1px solid ${rejected ? "#fecaca" : isActive ? "#2563eb" : "#e5e7eb"}`, background: rejected ? "#fef2f2" : "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{docType.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 11, color: rejected ? "#991b1b" : "#6b7280" }}>
                        {status === "rejected" ? "Rejected — please re-upload" : status === "uploading" ? "Uploading…" : entry.required ? "Required" : "Optional"}
                      </div>
                    </div>
                    {rejected?.rejection_reason && (<div style={{ fontSize: 12, color: "#991b1b", marginBottom: 6 }}>{rejected.rejection_reason}</div>)}
                    <input id={`mp-doc-input-${docType}`} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" style={{ display: "none" }} onChange={async (e) => { const files = Array.from(e.target.files || []); for (const f of files) { await uploadDocumentTyped(docType, f); } e.target.value = ""; }} />
                    <button type="button" disabled={isUploading} onClick={() => (document.getElementById(`mp-doc-input-${docType}`) as HTMLInputElement | null)?.click()} style={{ width: "100%", padding: "8px 12px", fontSize: 13, fontWeight: 600, background: isUploading ? "#e5e7eb" : "#2563eb", color: isUploading ? "#6b7280" : "#fff", border: 0, borderRadius: 6, cursor: isUploading ? "not-allowed" : "pointer" }}>
                      {isUploading ? "Uploading…" : rejected ? "Re-upload" : "Upload"}
                    </button>
                    {err && (<div style={{ fontSize: 12, color: "#991b1b", marginTop: 6 }}>{err}</div>)}
                  </div>
                );
              })}
            </div>
            <div className="mp-actions__chips" style={{ marginTop: 12 }}>
              {ACTION_CHIPS.filter((c) => c.id !== "upload").map((c) => (
                <button key={c.id} type="button" className="mp-chip" onClick={() => onChip(c.id)}>{c.label}</button>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              {callStatus === "idle" && (<button type="button" onClick={() => void startCall()} style={{ width: "100%", padding: "12px 16px", fontSize: 14, fontWeight: 700, background: "#2563eb", color: "#fff", border: 0, borderRadius: 24, cursor: "pointer" }}>📞 Call Us!</button>)}
              {callStatus === "connecting" && (<div style={{ padding: "12px 16px", textAlign: "center", color: "#92400e", background: "#fef3c7", borderRadius: 24 }}>Connecting…</div>)}
              {callStatus === "connected" && (<button type="button" onClick={() => hangup()} style={{ width: "100%", padding: "12px 16px", fontSize: 14, fontWeight: 700, background: "#dc2626", color: "#fff", border: 0, borderRadius: 24, cursor: "pointer" }}>End Call</button>)}
              {(callStatus === "error" || callStatus === "ended") && (<button type="button" onClick={() => void startCall()} style={{ width: "100%", padding: "12px 16px", fontSize: 14, fontWeight: 700, background: "#6b7280", color: "#fff", border: 0, borderRadius: 24, cursor: "pointer" }}>{callStatus === "error" ? "Retry call" : "Call again"}</button>)}
            </div>
          </aside>
        )}
        {showOfferView && <section className="mp-offers">{offers.length === 0 ? <div className="mp-offers__empty">No offers yet.</div> : offers.map((o) => { const exp = expirationColor(o.expiresAt); return <article key={o.id} className={`mp-offer mp-offer--${exp}`}><header className="mp-offer__head"><strong>{o.lenderName}</strong>{o.recommended ? <span className="mp-offer__badge">Recommended</span> : null}</header>{o.lenderLogoUrl ? <img className="mp-offer__logo" src={o.lenderLogoUrl} alt={o.lenderName} /> : null}<div className="mp-offer__amount">{o.amount ? `$${o.amount}` : "—"}</div><dl className="mp-offer__meta"><dt>Rate / Factor</dt><dd>{o.rateOrFactor ?? "—"}</dd><dt>Term</dt><dd>{o.term ?? "—"}</dd><dt>Payment</dt><dd>{o.paymentFrequency ?? "—"}</dd><dt>Expiration</dt><dd>{o.expiresAt ?? "—"}</dd></dl>{o.status === "pending_acceptance" || pendingOfferId === o.id ? <div className="mp-offer__pending">✓ Sent for staff confirmation. We'll text you when it's ready to sign.</div> : <div className="mp-offer__actions">{o.pdfUrl ? <a href={o.pdfUrl} target="_blank" rel="noopener noreferrer" data-testid="view-pdf-link" className="mp-btn mp-btn--ghost">View PDF</a> : null}<button type="button" data-testid="request-changes-btn" className="mp-btn mp-btn--secondary" onClick={() => void requestChanges(o.id)}>Request Changes</button><button type="button" data-testid="accept-offer-btn" className="mp-btn mp-btn--primary" onClick={() => void acceptOffer(o.id)}>Accept</button></div>}</article>; })}</section>}
      </div>
    </div>
  );
}
