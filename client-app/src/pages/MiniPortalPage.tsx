import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => { if (!applicationId) return; let active = true; async function loadAll() {
    try { const appData = await apiCall<any>(`/api/applications/${encodeURIComponent(applicationId)}`); if (!active) return; const raw = String(appData?.data?.pipeline_state ?? appData?.data?.stage ?? appData?.pipeline_state ?? appData?.stage ?? "").toLowerCase().replace(/\s+/g, "_"); if (raw in STAGE_BY_KEY) setStageIndex(STAGE_BY_KEY[raw as StageKey]); const p = appData?.data?.completion_pct ?? appData?.completion_pct ?? null; if (typeof p === "number" && p >= 0 && p <= 100) setPercent(Math.round(p)); } catch {}
    try { const incoming = await apiCall<any[]>(`/api/client/messages?applicationId=${encodeURIComponent(applicationId)}`).catch((): any[] => []); if (!active) return; setMessages(incoming.map((item: any, idx: number) => { const dir = String(item.direction ?? "").toLowerCase(); const role: "self" | "other" = dir === "inbound" ? "self" : "other"; return { id: String(item.id || idx), authorRole: role, authorName: item.authorName ?? (role === "self" ? "You" : "Boreal"), body: String(item.body ?? item.content ?? ""), createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()) }; })); } catch {}
    try { const offerData = await apiCall<{ items?: ServerOffer[]; data?: ServerOffer[] } | ServerOffer[]>(`/api/offers?applicationId=${encodeURIComponent(applicationId)}`).catch((): null => null); if (!active) return; const incoming: ServerOffer[] = Array.isArray(offerData) ? offerData : Array.isArray((offerData as any)?.items) ? (offerData as any).items : Array.isArray((offerData as any)?.data) ? (offerData as any).data : []; setOffers(incoming.map(normalizeOffer)); } catch {}
  }
  void loadAll(); const poll = setInterval(() => void loadAll(), 5000); return () => { active = false; clearInterval(poll); }; }, [applicationId]);

  const onChip = (id: string) => { if (id === "new") { reset(); navigate("/apply/step-1"); return; } if (id === "upload") { (document.getElementById("mp-upload") as HTMLInputElement | null)?.click(); return; } navigate(`/forms/${id}?applicationId=${encodeURIComponent(applicationId)}`); };
  const onHashtagClick = (tag: string) => { const id = tag.replace(/^#/, ""); const chip = ACTION_CHIPS.find((c) => c.id === id); if (chip) onChip(chip.id); else navigate(`/forms/${id}?applicationId=${encodeURIComponent(applicationId)}`); };
  async function acceptOffer(offerId: string) { await apiCall(`/api/offers/${encodeURIComponent(offerId)}/accept`, { method: "POST" }); setPendingOfferId(offerId); setOffers((cur) => cur.map((o) => (o.id === offerId ? { ...o, status: "pending_acceptance" } : o))); }
  async function requestChanges(offerId: string) { const reason = typeof window !== "undefined" ? window.prompt("What changes would you like to request?") : ""; if (reason === null) return; await apiCall(`/api/offers/${encodeURIComponent(offerId)}/decline`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) }); setOffers((cur) => cur.map((o) => (o.id === offerId ? { ...o, status: "changes_requested" } : o))); }
  async function sendMessage() { if (!text.trim() || !applicationId) return; const next = text.trim(); setText(""); await apiCall("/api/client/messages", { method: "POST", body: { applicationId, body: next, direction: "inbound" } }); setMessages((prev) => [...prev, { id: `local-${Date.now()}`, authorRole: "self", authorName: "You", body: next, createdAt: new Date().toISOString() }]); }
  async function uploadDocument(file: File) { if (!applicationId) return; const form = new FormData(); form.append("file", file); await fetch(`${ENV.API_BASE}/api/client/documents/upload`, { method: "POST", headers: { Authorization: `Bearer ${getToken() ?? ""}` }, body: form }); }

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
        <section className="mp-thread-card"><header className="mp-thread-card__header">Messages</header><div className="mp-thread-card__body"><MessageThread messages={messages} onHashtagClick={onHashtagClick} emptyText="Say hi to get started." /></div><div className="mp-thread-card__composer"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" onKeyDown={(e) => { if (e.key === "Enter") void sendMessage(); }} /><button onClick={() => void sendMessage()}>Send</button></div></section>
        {!showOfferView && <aside className="mp-actions"><div className="mp-actions__chips">{ACTION_CHIPS.map((c) => <button key={c.id} type="button" className="mp-chip" onClick={() => onChip(c.id)}>{c.label}</button>)}</div><input id="mp-upload" type="file" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadDocument(f); }} /><a className="mp-callus" href="tel:+18888884444">📞 Call Us!</a></aside>}
        {showOfferView && <section className="mp-offers">{offers.length === 0 ? <div className="mp-offers__empty">No offers yet.</div> : offers.map((o) => { const exp = expirationColor(o.expiresAt); return <article key={o.id} className={`mp-offer mp-offer--${exp}`}><header className="mp-offer__head"><strong>{o.lenderName}</strong>{o.recommended ? <span className="mp-offer__badge">Recommended</span> : null}</header>{o.lenderLogoUrl ? <img className="mp-offer__logo" src={o.lenderLogoUrl} alt={o.lenderName} /> : null}<div className="mp-offer__amount">{o.amount ? `$${o.amount}` : "—"}</div><dl className="mp-offer__meta"><dt>Rate / Factor</dt><dd>{o.rateOrFactor ?? "—"}</dd><dt>Term</dt><dd>{o.term ?? "—"}</dd><dt>Payment</dt><dd>{o.paymentFrequency ?? "—"}</dd><dt>Expiration</dt><dd>{o.expiresAt ?? "—"}</dd></dl>{o.status === "pending_acceptance" || pendingOfferId === o.id ? <div className="mp-offer__pending">✓ Sent for staff confirmation. We'll text you when it's ready to sign.</div> : <div className="mp-offer__actions">{o.pdfUrl ? <a href={o.pdfUrl} target="_blank" rel="noopener noreferrer" data-testid="view-pdf-link" className="mp-btn mp-btn--ghost">View PDF</a> : null}<button type="button" data-testid="request-changes-btn" className="mp-btn mp-btn--secondary" onClick={() => void requestChanges(o.id)}>Request Changes</button><button type="button" data-testid="accept-offer-btn" className="mp-btn mp-btn--primary" onClick={() => void acceptOffer(o.id)}>Accept</button></div>}</article>; })}</section>}
      </div>
    </div>
  );
}
