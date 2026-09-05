import { useEffect, useMemo, useState, useCallback } from "react";
import { safeParseDate } from "@/utils/safeDate";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApplicationStore } from "@/state/useApplicationStore";
import { apiCall } from "@/api/client";
import { ENV } from "@/env";
import { getToken } from "@/auth/token";
import { type ThreadMessage } from "@/components/messaging/MessageThread";
// BF_CLIENT_BLOCK_53_v1
import DocPicker from "@/components/DocPicker";
import { Device } from "@twilio/voice-sdk";
import "./MiniPortalPage.css";
import PersonalNetWorthForm from "@/pages/mini-portal/forms/forms/PersonalNetWorthForm";
import DebtStackForm from "@/pages/mini-portal/forms/forms/DebtStackForm";
// BF_CLIENT_BLOCK_v301_ACCORD_CMP_FORMS_v1
import CraAuthorizationForm from "@/pages/mini-portal/forms/forms/CraAuthorizationForm";
// BF_CLIENT_BLOCK_v302_FLINKS_CONNECT_v1
import FlinksConnectForm from "@/pages/mini-portal/forms/forms/FlinksConnectForm";
// BF_CLIENT_BLOCK_v304_ACCORD_FORMS_REBUILD_v1
import RealEstateCollateralForm from "@/pages/mini-portal/forms/forms/RealEstateCollateralForm";
// BF_CLIENT_BLOCK_v307_DEBT_EQUIP_PREFILL_v1
import EquipmentCollateralForm from "@/pages/mini-portal/forms/forms/EquipmentCollateralForm";
// BF_CLIENT_BLOCK_v708_ADVISORS_MINIPORTAL_v1
import AdvisorsForm from "@/pages/mini-portal/forms/forms/AdvisorsForm";
import LenderQaForm from "@/pages/mini-portal/forms/forms/LenderQaForm"; // BF_CLIENT_LENDER_QA_v1
import SlimHeader from "@/components/SlimHeader";
import InstallAppPrompt from "@/components/install/InstallAppPrompt";
import { useVisiblePoll } from "@/hooks/useVisiblePoll";

// BF_CLIENT_BLOCK_v317_MINI_PORTAL_STAGES_v1 — order per design mockups
// (Received → In Review → Documents Required → Additional Steps → Off to
// Lender → Offer). Pre-fix had Documents Required before In Review which
// drove the wrong checkmark progression at every stage.
const STAGES = [
  { key: "received", label: "Received" },
  { key: "in_review", label: "In Review" },
  { key: "documents_required", label: "Documents Required" },
  { key: "additional_steps_required", label: "Additional Steps Required" },
  { key: "off_to_lender", label: "Off to Lender" },
  { key: "offer", label: "Offer" },
] as const;
type StageKey = (typeof STAGES)[number]["key"];
const STAGE_BY_KEY: Record<string, number> = STAGES.reduce((acc, s, i) => ({ ...acc, [s.key]: i }), {} as Record<string, number>);

type ServerOffer = { id: string; lender_name?: string; lender_logo_url?: string | null; amount?: string | number | null; rate_factor?: string | null; term?: string | null; payment_frequency?: string | null; expiry_date?: string | null; document_url?: string | null; status?: string; recommended?: boolean };
type Offer = { id: string; lenderName: string; lenderLogoUrl?: string; amount?: string; rateOrFactor?: string; term?: string; paymentFrequency?: string; expiresAt?: string; pdfUrl?: string; status?: string; recommended?: boolean };
function normalizeOffer(s: ServerOffer): Offer { return { id: s.id, lenderName: s.lender_name ?? "Unknown lender", lenderLogoUrl: s.lender_logo_url ?? undefined, amount: s.amount == null ? undefined : String(s.amount), rateOrFactor: s.rate_factor ?? undefined, term: s.term ?? undefined, paymentFrequency: s.payment_frequency ?? undefined, expiresAt: s.expiry_date ?? undefined, pdfUrl: s.document_url ?? undefined, status: s.status, recommended: Boolean(s.recommended) }; }
// BF_CLIENT_OFFERS_IN_THREAD_v3 - an offer past its expiry is greyed, not
// removed: a client who missed it should still see that it existed.
function isOfferExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const t = safeParseDate(expiresAt).getTime();
  if (Number.isNaN(t)) return false;
  return t <= Date.now();
}

function expirationColor(expiresAt?: string): "ok" | "warn" | "danger" { if (!expiresAt) return "ok"; const t = safeParseDate(expiresAt).getTime(); if (Number.isNaN(t)) return "ok"; const diffDays = (t - Date.now()) / 86_400_000; if (diffDays <= 2) return "danger"; if (diffDays <= 4) return "warn"; return "ok"; }
// BF_CLIENT_BLOCK_53_v1 -- final 7-pill spec. Media dropped per
// product decision (2026-05-17). Upload Documents is the first pill
// and opens DocPicker, not the file input.
const ACTION_CHIPS = [
  { id: "upload",     label: "Upload Documents" },
  { id: "new",        label: "New Application" },
  { id: "networth",   label: "Personal Net Worth Statement" },
  { id: "cra",        label: "CRA Authorization" },
  { id: "flinks",     label: "Connect Bank (View-Only)" },
  { id: "equipment",  label: "Equipment Collateral Form" },
  { id: "realestate", label: "Real Estate Collateral Form" },
  { id: "debt",       label: "Debt Stack" },
  // BF_CLIENT_BLOCK_v708_ADVISORS_MINIPORTAL_v1
  { id: "advisors",   label: "Professional Advisors" },
  // BF_CLIENT_SBA_FORMS_ENTRY_v142 - opens the stage-2 page, which lists the
  // 1919 and a 413 per owner. Shown only on SBA files; see sbaChips below.
  { id: "sba_forms",  label: "SBA Forms" },
] as const;

export default function MiniPortalPage() {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { app, startNewApplication } = useApplicationStore();
  const applicationId = routeId || searchParams.get("applicationId") || app.applicationId || app.applicationToken || "";
  const [messages, setMessages] = useState<ThreadMessage[]>([]); const [text, setText] = useState(""); const [stageIndex, setStageIndex] = useState(0); const [offers, setOffers] = useState<Offer[]>([]); const [pendingOfferId, setPendingOfferId] = useState<string | null>(null); const [offersOpen, setOffersOpen] = useState(false); // BF_CLIENT_OFFERS_MODAL_v1

  // BF_CLIENT_TERM_SHEET_STREAM_v1 - fetch the PDF from BF-Server (authenticated) and open it
  // as an object URL. Linking straight at the Azure blob URL broke once the SAS expired or the
  // blob was private: Chrome rendered the error page and showed "Failed to load PDF document".
  const openTermSheet = useCallback(async (o: Offer) => {
    try {
      const base = ENV.API_BASE || "https://server.boreal.financial";
      const res = await fetch(`${base}/api/offers/${o.id}/term-sheet`, { headers: { Authorization: `Bearer ${getToken() ?? ""}` } });
      if (!res.ok) throw new Error(`term_sheet_${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noreferrer");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      if (o?.pdfUrl) window.open(o.pdfUrl, "_blank", "noreferrer"); // legacy fallback
    }
  }, []);
  // BF_CLIENT_BLOCK_v727_APP_SWITCHER_v1 — the caller's applications for the switcher
  const [myApps, setMyApps] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiCall<any>(`/api/client/applications/by-phone?includeDrafts=true`);
        const list = Array.isArray(r?.applications) ? r.applications : r?.application ? [r.application] : [];
        if (!cancelled) setMyApps(list);
      } catch { /* switcher is best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [applicationId]);
  // BF_CLIENT_BLOCK_v162_MINI_PORTAL_REJECTED_DOCS_BANNER_v1
  type RejectedDoc = { id: string; category: string | null; filename: string | null; rejection_reason: string | null; updated_at: string | null };
  const [rejectedDocs, setRejectedDocs] = useState<RejectedDoc[]>([]);
  // BF_CLIENT_DOCS_BUBBLE_GATE_v1 — outstanding-docs gating + received confirmation.
  const [hasOutstandingDocs, setHasOutstandingDocs] = useState(false);
  const [docsChecked, setDocsChecked] = useState(false);
  // BF_CLIENT_BLOCK_v301_ACCORD_CMP_FORMS_v1 — application detail captured for form prefill
  const [appDetail, setAppDetail] = useState<any>(null);
  // BF_CLIENT_BLOCK_v301_ACCORD_CMP_FORMS_v1 — best-effort prefill for the Personal Statement of Affairs.
  // BF_CLIENT_BLOCK_v307_DEBT_EQUIP_PREFILL_v1 — one canonical prefill object
  // consumed by every CMP form. Forms map these canonical keys to their fields.
  const cmpPrefill = useMemo<Record<string, unknown>>(() => {
    const md = (appDetail?.data?.application?.metadata ?? appDetail?.data?.metadata ?? appDetail?.metadata ?? {}) as any;
    const a: any = (app.applicant && (app.applicant as any).firstName) ? app.applicant : (md.applicant ?? md.borrower ?? app.applicant ?? {});
    const biz: any = md.business ?? appDetail?.data?.application?.business ?? appDetail?.data?.business ?? appDetail?.business ?? {};
    const fullName = [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
    const out: Record<string, unknown> = {};
    if (fullName) out.fullName = fullName;
    if (a.email) out.email = a.email;
    if (a.phone ?? a.cellPhone) out.cellPhone = a.phone ?? a.cellPhone;
    if (a.homePhone) out.homePhone = a.homePhone;
    if (a.workPhone) out.workPhone = a.workPhone;
    if (a.ssn ?? a.sin) out.sin = a.ssn ?? a.sin;
    const dob = String(a.dob ?? a.dateOfBirth ?? "");
    if (dob) out.dob = dob;
    if (a.street) out.street = a.street;
    if (a.city) out.city = a.city;
    if (a.state ?? a.province) out.province = a.state ?? a.province;
    if (a.zip ?? a.postal) out.postal = a.zip ?? a.postal;
    const bizName = biz.name ?? biz.legalName ?? biz.businessName ?? md.businessName ?? md.legalBusinessName;
    if (bizName) out.businessName = bizName;
    return out;
  }, [appDetail, app.applicant]);

  const loadAll = useCallback(async () => {
    if (!applicationId) return;
    try { const appData = await apiCall<any>(`/api/applications/${encodeURIComponent(applicationId)}`); if (!applicationId) return; setAppDetail(appData); /* BF_CLIENT_BLOCK_v309_APPDETAIL_NESTING_v1 — GET /:id returns { data: { application } }; stage lives at data.application.pipeline_state */ const raw = String(appData?.data?.application?.pipeline_state ?? appData?.data?.application?.current_stage ?? appData?.data?.pipeline_state ?? appData?.data?.stage ?? appData?.pipeline_state ?? appData?.stage ?? "").toLowerCase().replace(/\s+/g, "_"); if (raw in STAGE_BY_KEY) setStageIndex(STAGE_BY_KEY[raw as StageKey]); } catch {}
    // BF_CLIENT_BLOCK_v310_CLIENT_STAGE_v1 — /api/applications/:id is staff-gated (401 for the
    // client mini-portal), so the read above silently fails and the tracker stuck at "Received".
    // Read the live stage from the client-accessible endpoint.
    try { const stg = await apiCall<any>(`/api/client/application-stage?applicationId=${encodeURIComponent(applicationId)}`); const sraw = String(stg?.pipeline_state ?? stg?.data?.pipeline_state ?? "").toLowerCase().replace(/\s+/g, "_"); if (sraw in STAGE_BY_KEY) setStageIndex(STAGE_BY_KEY[sraw as StageKey]); /* BF_CLIENT_BLOCK_v311_CLIENT_PREFILL_v1 — staff /:id is gated (401 for the client), so the prefill metadata never loaded and the CMP forms came up blank. Take metadata from the client endpoint. */ const md = stg?.metadata ?? stg?.data?.metadata ?? null; if (md) setAppDetail((prev: any) => ({ data: { application: { metadata: md, pipeline_state: stg?.pipeline_state ?? prev?.data?.application?.pipeline_state ?? null } } })); } catch {}
    try {
      // BF_CLIENT_BLOCK_v326 — on a failed fetch (incl. 429), throw to the outer
      // catch and PRESERVE the thread. The old .catch(()=>[]) wiped all messages.
      const incoming = await apiCall<any[]>(`/api/client/messages?applicationId=${encodeURIComponent(applicationId)}`);
      if (!applicationId) return;
      if (Array.isArray(incoming)) setMessages(incoming.map((item: any, idx: number) => {
        const dir = String(item.direction ?? "").toLowerCase();
        const role: "self" | "other" = dir === "inbound" ? "self" : "other";
        return {
          id: String(item.id || idx),
          authorRole: role,
          // BF_CLIENT_BLOCK_v317_MINI_PORTAL_STAGES_v1 — prefer the staff_name
          // returned by v636 over the generic "Boreal" fallback.
          authorName: item.authorName ?? item.staff_name ?? item.staffName ?? (role === "self" ? "You" : "Boreal"),
          body: String(item.body ?? item.content ?? ""),
          createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
          ctaLabel: typeof item.cta_label === "string" ? item.cta_label : (typeof item.ctaLabel === "string" ? item.ctaLabel : null),
          ctaAction: typeof item.cta_action === "string" ? item.cta_action : (typeof item.ctaAction === "string" ? item.ctaAction : null),
          attachments: Array.isArray(item.attachments) ? item.attachments : null,
        };
      }));
    } catch {}
    try { const offerData = await apiCall<{ items?: ServerOffer[]; data?: ServerOffer[] } | ServerOffer[]>(`/api/offers?applicationId=${encodeURIComponent(applicationId)}`).catch((): null => null); if (!applicationId) return; const incoming: ServerOffer[] = Array.isArray(offerData) ? offerData : Array.isArray((offerData as any)?.items) ? (offerData as any).items : Array.isArray((offerData as any)?.data) ? (offerData as any).data : []; setOffers(incoming.map(normalizeOffer)); } catch {}
    // BF_CLIENT_QA_CHIP_GATE_v1 — learn whether lender questions are still outstanding
    // so the "Answer lender questions" chip hides once everything is answered.
    try {
      const qaOpen = await apiCall<{ questions?: unknown[] }>(`/api/portal/applications/${encodeURIComponent(applicationId)}/qa/open`).catch((): null => null);
      if (!applicationId) return;
      setHasOpenQa(Array.isArray((qaOpen as any)?.questions) && (qaOpen as any).questions.length > 0);
      setQaChecked(true);
    } catch {}
    // BF_CLIENT_BLOCK_v162_MINI_PORTAL_REJECTED_DOCS_BANNER_v1
    try {
      const docsResp = await apiCall<any>(`/api/applications/${encodeURIComponent(applicationId)}/documents`).catch((): any => null);
      if (!applicationId) return;
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
    // BF_CLIENT_DOCS_BUBBLE_GATE_v1 — same outstanding-docs signal the DocPicker uses, so the
    // upload prompt + Upload Documents chip disappear once the client has uploaded everything.
    try {
      const needed = await apiCall<{ stillNeeded?: any[]; rejected?: any[] }>(`/api/client/documents-needed/needed?applicationId=${encodeURIComponent(applicationId)}`).catch((): any => null);
      if (!applicationId) return;
      const outstanding = (Array.isArray(needed?.stillNeeded) ? needed!.stillNeeded.length : 0) + (Array.isArray(needed?.rejected) ? needed!.rejected.length : 0);
      setHasOutstandingDocs(outstanding > 0);
    } catch {} finally { setDocsChecked(true); }
  }, [applicationId]);

  // BF_CLIENT_BLOCK_v323_MOBILE_FIRST_LAUNCH_v1 — poll the
  // conversation every 15s so staff replies surface without the user
  // needing to refresh. Pre-fix new messages only arrived on page
  // reload. Pause when the tab is hidden to save battery.
  useVisiblePoll(loadAll, 30000); // BF_CLIENT_BLOCK_v_CMP_POLL_CALM_v1 — was 15000; halves loadAll's 6-call fan-out

  // BF_CLIENT_BLOCK_v771_SWITCH_REFETCH — useVisiblePoll only re-runs on its
  // interval (every 15s), not when loadAll's applicationId changes, so switching
  // applications showed the previous app's stage/requirements until the next
  // poll tick or a manual refresh. Re-fetch now on every app switch.
  useEffect(() => { void loadAll(); }, [loadAll]);


  const onMessageCta = useCallback((action: string) => {
    if (!action) return;
    const [kind, rest] = action.split(":", 2);
    if (kind === "upload" && rest) {
      setShowDocPicker(true);
      return;
    }
    if (kind === "form" && rest) {
      // BF_CLIENT_BLOCK_v324 — open the form modal (the /forms/* route doesn't
      // exist; the pills use setOpenForm, so CTAs must too).
      if (rest === "networth" || rest === "debt" || rest === "equipment" || rest === "realestate" || rest === "cra" || rest === "flinks" || rest === "advisors") {
        setOpenForm(rest);
      }
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
  const [openForm, setOpenForm] = useState<null | "networth" | "debt" | "equipment" | "realestate" | "cra" | "flinks" | "advisors" | "lender_qa">(null);
  const [hasOpenQa, setHasOpenQa] = useState(false); // BF_CLIENT_QA_CHIP_GATE_v1
  const [qaChecked, setQaChecked] = useState(false); // BF_CLIENT_QA_CHIP_GATE_v1
  // BF_CLIENT_BLOCK_v325 — embedded SignNow signing session rendered in-portal.
  const [showSign, setShowSign] = useState(false);
  // BF_CLIENT_BLOCK_v_ACCOUNT_DELETE_v1 — 0=closed, 1=first warning, 2=second warning, 3=deleting
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [signSession, setSignSession] = useState<{ status: string; url?: string; reason?: string } | null>(null);
  const [signLoading, setSignLoading] = useState(false);
  const fetchSigningSession = useCallback(async () => {
    if (!applicationId) return;
    setSignLoading(true);
    try {
      const r = await apiCall<any>(`/api/client/signing-session?applicationId=${encodeURIComponent(applicationId)}`);
      setSignSession({ status: String(r?.status ?? "error"), url: typeof r?.url === "string" ? r.url : undefined, reason: typeof r?.reason === "string" ? r.reason : undefined });
    } catch {
      // BF_CLIENT_BLOCK_v_CMP_POLL_CALM_v1 — a transient /signing-session failure
      // (e.g. a rate-limit blip) must NOT hide the Sign button. Keep the last
      // known state if we already had one; only show error if we never loaded.
      setSignSession((prev) => prev ?? { status: "error" });
    }
    finally { setSignLoading(false); }
  }, [applicationId]);
  // BF_CLIENT_BLOCK_v_SIGNING_COMPLETE_v1 — the SignNow webhook does not reliably
  // fire, so the server never learns the app was signed. When the iframe completes
  // / the modal closes / the client returns, tell the server; it verifies with
  // SignNow before marking signed + firing the lender package. Replaces the old
  // 6s signing-session poll that only re-read a status the server never updated.
  const markSigningComplete = useCallback(async () => {
    if (!applicationId) return;
    try {
      const r = await apiCall<any>(`/api/client/signing-complete?applicationId=${encodeURIComponent(applicationId)}`, { method: "POST" });
      if (r?.signed) { setShowSign(false); void fetchSigningSession(); void loadAll(); }
    } catch { /* transient; a later trigger will retry */ }
  }, [applicationId, fetchSigningSession, loadAll]);
  // Block 6 — learn signing readiness on load so the Sign chip gates on it, not stage.
  useEffect(() => { if (applicationId) { void fetchSigningSession(); void markSigningComplete(); } }, [applicationId, fetchSigningSession, markSigningComplete]);
  useEffect(() => {
    if (!showSign) return;
    const onMsg = (ev: MessageEvent) => {
      const d = typeof ev.data === "string" ? ev.data : (ev.data && typeof ev.data === "object" ? JSON.stringify(ev.data) : "");
      if (/finish|complete|signed|document_signed/i.test(d)) { void markSigningComplete(); }
    };
    window.addEventListener("message", onMsg);
    const t = window.setInterval(() => { void markSigningComplete(); }, 15000); // BF_CLIENT_BLOCK_v_CMP_POLL_CALM_v1 — was 8000
    return () => { window.removeEventListener("message", onMsg); window.clearInterval(t); };
  }, [showSign, markSigningComplete]);
  // BF_CLIENT_BLOCK_v315_MINI_PORTAL_FORM_MODALS_v1 — CMP actions open
  // as modals with real forms. The legacy /forms/* route doesn't exist
  // and was scrolling-to-top silently.
  const onChip = (id: string) => {
    if (id === "new") { startNewApplication(); navigate("/apply/step-1"); return; }
    if (id === "upload") { setShowDocPicker(true); return; }
    if (id === "networth" || id === "debt" || id === "equipment" || id === "realestate" || id === "cra" || id === "flinks" || id === "advisors") {
      setOpenForm(id);
      return;
    }
    if (id === "sign") { setShowSign(true); void fetchSigningSession(); return; }
    // BF_CLIENT_SBA_FORMS_ENTRY_v142 - a page, not a modal: it lists several
    // forms and tracks which are done.
    if (id === "sba_forms") { navigate(`/mini-portal/forms/${encodeURIComponent(applicationId)}`); return; }
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
      // BF_CLIENT_BLOCK_v308_CALLUS_TOKEN_URL_v1 — the token fetch was a relative
      // URL, which on the Static Web App host resolved to index.html (SPA fallback)
      // and made r.json() throw "Unexpected token '<'". Use the API base.
      const voiceBase = (ENV.API_BASE || "https://server.boreal.financial").replace(/\/+$/, "");
      const tokenUrl = `${voiceBase}/api/client/voice/token?applicationId=${encodeURIComponent(applicationId)}`;
      const r = await fetch(tokenUrl, { credentials: "include" });
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        throw new Error(errBody?.error || `token fetch failed (${r.status})`);
      }
      const tokenResp = await r.json();
      if (!tokenResp?.token) throw new Error("No token returned");
      // agents_available is informational — if false, warn the user but still allow them to leave voicemail.
      if (tokenResp.agents_available === false) {
        const proceed = window.confirm("No advisors are available right now. You can leave a voicemail and we'll call you back, or cancel and send us a message in the chat below. Continue to voicemail?");
        if (!proceed) { setCallState("idle"); return; }
      }
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
  // BF_CLIENT_BLOCK_v322_MINI_PORTAL_REALTIME_v1 — typing emit + staff typing
  // indicator + attachment support on the mini-portal composer.
  const [attachments, setAttachments] = useState<Array<{ name: string; contentType: string; dataUrl: string }>>([]);
  const [staffTyping, setStaffTyping] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!applicationId) return;
    apiCall("/api/client/messages/mark-read", { method: "POST", body: { applicationId } }).catch((): void => undefined);
  }, [applicationId, messages.length]);

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    const tick = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const r = await apiCall<{ typing: boolean }>(`/api/client/messages/typing?applicationId=${encodeURIComponent(applicationId)}`);
        if (!cancelled) setStaffTyping(Boolean((r as any)?.typing));
      } catch { /* swallow — incl. 429; never affects the thread */ }
    };
    void tick();
    // BF_CLIENT_BLOCK_v326 — was 3s, which (with the other polls) tripped the
    // server read rate limit and produced a 429 storm. 10s + hidden-tab pause.
    const id = setInterval(tick, 20000); // BF_CLIENT_BLOCK_v_CMP_POLL_CALM_v1 — was 10000
    return () => { cancelled = true; clearInterval(id); };
  }, [applicationId]);

  useEffect(() => {
    if (!text || !applicationId) return;
    apiCall("/api/client/messages/typing", { method: "POST", body: { applicationId } }).catch((): void => undefined);
  }, [text, applicationId]);

  async function stageFile(file: File): Promise<void> {
    if (file.size > 3 * 1024 * 1024) return;
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result ?? ""));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
    setAttachments((prev) => [...prev, { name: file.name, contentType: file.type || "application/octet-stream", dataUrl }]);
    setStagedFiles((prev) => [...prev, file]);
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // BF_CLIENT_SIGNED_TERM_SHEET_v4 - goes through the same client upload the
  // DocPicker uses, tagged with the offer so staff know which one it signs.
  const [signingOfferId, setSigningOfferId] = useState<string | null>(null);

  async function uploadSignedTermSheet(offerId: string, file: File) {
    setSigningOfferId(offerId);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", "signed_term_sheet");
      form.append("documentType", "signed_term_sheet");
      form.append("applicationId", applicationId);
      form.append("offerId", offerId);
      const res = await fetch(`${ENV.API_BASE}/api/client/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
        body: form,
      });
      if (!res.ok) throw new Error(String(res.status));
      // Staff still accept it, so say what happens next rather than "done".
      setMessages((cur) => [...cur, {
        id: `signed-${offerId}-${Date.now()}`,
        authorRole: "other",
        authorName: "Boreal",
        body: "Signed term sheet received. We'll review it and be in touch shortly.",
        createdAt: new Date().toISOString(),
      }]);
    } catch {
      window.alert("We couldn't upload that file. Please try again, or reply here and we'll help.");
    } finally {
      setSigningOfferId(null);
    }
  }

  async function acceptOffer(offerId: string) { await apiCall(`/api/offers/${encodeURIComponent(offerId)}/accept`, { method: "POST" }); setPendingOfferId(offerId); setOffers((cur) => cur.map((o) => (o.id === offerId ? { ...o, status: "pending_acceptance" } : o))); }
  async function requestChanges(offerId: string) { const reason = typeof window !== "undefined" ? window.prompt("What changes would you like to request?") : ""; if (reason === null) return; await apiCall(`/api/offers/${encodeURIComponent(offerId)}/request-changes`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) }); setOffers((cur) => cur.map((o) => (o.id === offerId ? { ...o, status: "changes_requested" } : o))); }
  async function sendMessage() {
    if ((!text.trim() && attachments.length === 0) || !applicationId) return;
    const next = text.trim();
    const attach = attachments;
    setText("");
    setAttachments([]);
    setStagedFiles([]);
    await apiCall("/api/client/messages", { method: "POST", body: { applicationId, body: next, direction: "inbound", attachments: attach } });
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, authorRole: "self", authorName: "You", body: next, createdAt: new Date().toISOString(), attachments: attach.length ? attach : null }]);
  }

  // BF_CLIENT_BLOCK_v_ACCOUNT_DELETE_v1 — immediate hard delete (staff-side cascade),
  // gated by two warnings. Clears the local session and returns to OTP on success.
  const confirmDeleteAccount = useCallback(async () => {
    setDeleteErr(null);
    setDeleteStep(3);
    try {
      await apiCall("/api/client/account/delete", { method: "POST", body: { applicationId } });
      try { window.localStorage.removeItem("client_session"); } catch { /* ignore */ }
      navigate("/otp", { replace: true });
    } catch {
      setDeleteErr("We couldn't delete your account just now. Please try again, or call us for help.");
      setDeleteStep(2);
    }
  }, [applicationId, navigate]);

  const stageRow = useMemo(() => STAGES.map((s, i) => ({ ...s, completed: i < stageIndex, current: i === stageIndex })), [stageIndex]);
  // BF_CLIENT_AUDIT_FIX_v2 -- center the current stage in the horizontally-scrollable tracker (mobile)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.querySelector(".mp-tracker .mp-stage--current") as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [stageIndex]);
  // Show the offer view whenever the app actually has an offer, not only when
  // the stage read says "offer" — a lagging/stale pipeline_state must never hide
  // a real offer (and its Accept button) from the client.
  const showOfferView = offers.length > 0 || stageIndex === STAGE_BY_KEY.offer;
  const actionByKeyword: Record<string, string> = { upload_docs: "upload", open_personal_net_worth: "networth", new_application: "new", equipment_collateral: "equipment", real_estate_collateral: "realestate", debt_stack: "debt", other_forms: "debt" };
  const isUrl = (v: string) => /^https?:\/\//i.test(v);
  // BF_CLIENT_DOCS_BUBBLE_GATE_v1 — identify document-upload prompt messages so the bubble can
  // be hidden once the application has no outstanding documents.
  const isDocUploadPrompt = (cta?: string | null) => {
    const k = String(cta ?? "");
    return k === "upload_docs" || k === "upload" || k.startsWith("upload:");
  };
  // BF_CLIENT_BLOCK_v_STALE_TASK_PROMPT_GATE_v1 — identify step/task prompts (CRA,
  // Connect Bank, Net Worth, etc.) so they can be hidden once the app has advanced
  // past the additional-steps stage (see pastAdditionalSteps below).
  const isTaskPrompt = (cta?: string | null) => {
    let k = String(cta ?? "");
    if (k.startsWith("form:")) k = k.slice(5);
    return ["cra", "flinks", "networth", "equipment", "realestate", "debt", "advisors"].includes(k);
  };
  // Once staff move the app to Off to Lender / Offer, the "few quick steps" prompt and
  // its task buttons are stale and contradict the green all-clear banner (gated on the
  // same stage). Hide them so the client is never told to do work no longer outstanding.
  const pastAdditionalSteps = stageIndex > STAGE_BY_KEY.additional_steps_required;
  const handleMessageCta = (ctaAction?: string | null) => {
    if (!ctaAction) return;
    if (isUrl(ctaAction)) { window.open(ctaAction, "_blank", "noopener,noreferrer"); return; }
    if (ctaAction in actionByKeyword) { onChip(actionByKeyword[ctaAction]); return; }
    if (ctaAction === "lender_qa") { setOpenForm("lender_qa"); return; }
    // BF_CLIENT_SBA_FORMS_ENTRY_v142 - accepts the canonical cta and the raw
    // doc types, so prompts already sitting in a thread start working too.
    if (/^(sba_forms|sba1919|sba413|sba_form_1919|sba_form_413(_owner_\d+)?)$/i.test(ctaAction)) {
      onChip("sba_forms");
      return;
    }
    // BF_CLIENT_BLOCK_v721 — Stage-2 buttons carry cta_action = chip id
    // ("cra","flinks","networth",...); also accept legacy "form:<id>". Open the modal.
    const formId = ctaAction.startsWith("form:") ? ctaAction.slice(5) : ctaAction;
    if (["upload", "new", "networth", "cra", "flinks", "equipment", "realestate", "debt", "advisors"].includes(formId)) {
      onChip(formId);
      return;
    }
    onMessageCta(ctaAction);
  };

  // BF_CLIENT_SBA_FORMS_ENTRY_v142 - mirrors the server's isSbaApplication:
  // product category first, wizard purpose as the fallback for a file not yet
  // matched to a product.
  const isSbaApplication = (() => {
    const cat = String((app as any)?.productCategory ?? (app as any)?.product_category ?? "").toUpperCase();
    if (cat.includes("SBA")) return true;
    const purpose = String((app as any)?.purposeOfFunds ?? (app as any)?.purpose_of_funds ?? "").toLowerCase();
    return purpose.includes("sba") || purpose.includes("start up") || purpose.includes("start-up");
  })();
  // BF_CLIENT_QA_FLOW_FIXES_v1 - CRA Authorization is Canada-only; show it unless
  // the file is clearly US. Collateral forms only where equipment/RE/ABL/SBA apply.
  const countryIsCanada = (() => {
    const loc = String((app as any)?.kyc?.businessLocation ?? (app as any)?.businessLocation ?? (app as any)?.country ?? "").toUpperCase();
    return !(loc.includes("UNITED STATES") || loc === "US" || loc === "USA" || loc.includes("U.S"));
  })();
  const collateralRelevant = (() => {
    const cat = String((app as any)?.productCategory ?? (app as any)?.product_category ?? "").toUpperCase();
    return isSbaApplication || cat.includes("EQUIPMENT") || cat.includes("ABL") || cat.includes("REAL") || cat.includes("LEASE");
  })();

  const currentStageLabel = STAGES[stageIndex]?.label ?? "";
  // BF_CLIENT_BLOCK_v727_APP_SWITCHER_v1 — "category · $amount — stage"
  const PRODUCT_LABELS: Record<string, string> = {
    EQUIPMENT_FINANCING: "Equipment", EQUIPMENT_FINANCE: "Equipment", EQUIPMENT: "Equipment",
    LINE_OF_CREDIT: "LOC", LOC: "LOC",
    TERM_LOAN: "Term Loan",
    WORKING_CAPITAL: "Working Capital",
    INVOICE_FACTORING: "Factoring", FACTORING: "Factoring",
    STARTUP: "Startup",
  };
  const prettyCategory = (raw: string) => {
    const key = raw.toUpperCase().replace(/[\s-]+/g, "_");
    if (PRODUCT_LABELS[key]) return PRODUCT_LABELS[key];
    return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  };
  const fmtApp = (a: any) => {
    const cat = String(a?.product_category ?? "").trim();
    const amt = Number(a?.requested_amount ?? 0);
    const amtStr = Number.isFinite(amt) && amt > 0 ? ` \u00b7 $${amt.toLocaleString()}` : "";
    const stageRaw = String(a?.pipeline_state ?? "").trim();
    const stage = /^draft$/i.test(stageRaw) ? "Draft" : stageRaw;
    const biz = String(a?.business_name ?? a?.businessName ?? a?.legal_business_name ?? "").trim();
    const idSuffix = String(a?.id ?? "").slice(-4).toUpperCase();
    return `${biz ? biz + " \u00b7 " : ""}${cat ? prettyCategory(cat) : "Application"}${amtStr}${stage ? ` \u2014 ${stage}` : ""}${idSuffix ? " \u00b7 #" + idSuffix : ""}`;
  };
  const shortId = applicationId
    ? applicationId.length > 8
      ? applicationId.slice(-8).toUpperCase()
      : applicationId.toUpperCase()
    : "";

  return (
    <>
      <SlimHeader />  {/* BF_CLIENT_BLOCK_v75_FORMS_AUTH_AND_SLIM_HEADER_v1 */}
      <div className="mp-root">
      <InstallAppPrompt />
      {/* BF_CLIENT_BLOCK_v727_APP_SWITCHER_v1 — multiple application switcher */}
      {myApps.length > 1 && (
        <div style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label htmlFor="mp-app-switch" style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Your applications</label>
          <select
            id="mp-app-switch"
            value={applicationId}
            onChange={(e) => { const id = e.target.value; if (id && id !== applicationId) navigate(`/application/${encodeURIComponent(id)}`); }}
            style={{ flex: 1, minWidth: 0, maxWidth: 520, padding: "8px 10px", fontSize: 13, color: "#0f172a", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6 }}
          >
            {myApps.map((a) => (
              <option key={String(a.id)} value={String(a.id)}>{fmtApp(a)}</option>
            ))}
          </select>
        </div>
      )}
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
          {/* BF_CLIENT_BLOCK_v_ACCOUNT_DELETE_v1 — store-required account/data deletion */}
          <button
            type="button"
            className="mp-account-delete-link"
            onClick={() => { setDeleteErr(null); setDeleteStep(1); }}
            style={{ marginLeft: 16, background: "transparent", border: "none", color: "#6b7280", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0 }}
          >
            Delete account
          </button>
        </div>
      </header>
      {deleteStep > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 20 }}
        >
          <div style={{ background: "var(--color-surface, #fff)", borderRadius: 14, maxWidth: 440, width: "100%", padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 19, color: "#0f172a" }}>Delete your account?</h2>
            {deleteStep === 1 && (
              <>
                <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.5, color: "#374151" }}>
                  If you delete your account, any active applications will also be deleted. This cannot be undone.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setDeleteStep(0)} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer" }}>Keep my account</button>
                  <button type="button" onClick={() => setDeleteStep(2)} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Continue</button>
                </div>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.5, color: "#374151" }}>
                  Once deleted, Boreal Financial will not be allowed to communicate with you regarding lender communications, offers to finance, or to assist you with completing your funding.
                </p>
                {deleteErr && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#dc2626" }}>{deleteErr}</p>}
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setDeleteStep(0)} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button type="button" onClick={() => void confirmDeleteAccount()} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Delete my account</button>
                </div>
              </>
            )}
            {deleteStep === 3 && (
              <p style={{ margin: 0, fontSize: 14, color: "#374151" }}>Deleting your account…</p>
            )}
          </div>
        </div>
      )}
      <div className="mp-tracker" role="list" aria-label="Application progress">
        {stageRow.map((s) => (
          <div key={s.key} role="listitem" className={`mp-stage ${s.completed ? "mp-stage--done" : ""} ${s.current ? "mp-stage--current" : ""}`}>
            <div className="mp-stage__bullet">{s.completed ? "✓" : ""}</div>
            <div className="mp-stage__label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className={`mp-grid ${showOfferView ? "mp-grid--offers" : ""}`}>
        <section className="mp-thread-card">
          <header className="mp-thread-card__header">Client</header>
          <div className="mp-thread-card__body">
            {signSession?.status === "ready" ? (
              <div data-testid="sign-prompt-note" style={{ margin: "0 0 10px", padding: "12px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, color: "#1e3a8a", fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Your application package is now complete and ready to be sent to the Lender partner(s). The last step is for you to sign your application documents. Click the button below to do so now.
                </div>
                <button type="button" className="mp-chip mp-chip--action" onClick={() => onChip("sign")} style={{ fontWeight: 600 }}>
                  Sign Documents
                </button>
              </div>
            ) : null}
            {/* BF_CLIENT_ALL_RECEIVED_NOTE_v1 — positive confirmation once nothing is outstanding. */}
            {docsChecked && !hasOutstandingDocs && signSession?.status !== "ready"
              // BF_CLIENT_BLOCK_v_CMP_REQUIRED_BANNER_v1 — hasOutstandingDocs covers
              // DOCS only, not the required form steps (CRA/Connect Bank/Advisors).
              // During the documents/additional-steps stages those forms may still be
              // pending, so the "nothing outstanding" reassurance is misleading there.
              // Only show it once staff have advanced the app past those stages.
              && stageIndex !== STAGE_BY_KEY.documents_required
              && stageIndex !== STAGE_BY_KEY.additional_steps_required ? (
              <div data-testid="all-received-note" style={{ margin: "0 0 10px", padding: "10px 12px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, color: "#065f46", fontSize: 13, fontWeight: 600 }}>
                ✓ All required tasks and documents received — nothing outstanding right now.
              </div>
            ) : null}
            {messages.length === 0 ? <div className="mp-thread-card__empty">Say hi to get started.</div> : messages.map((m) => {
              if (!hasOutstandingDocs && isDocUploadPrompt(m.ctaAction)) return null;
              // BF_CLIENT_BLOCK_v_STALE_TASK_PROMPT_GATE_v1
              if (pastAdditionalSteps && typeof m.body === "string" && /few quick steps to finish/i.test(m.body)) return null;
              if (pastAdditionalSteps && isTaskPrompt(m.ctaAction)) return null;
              if (m.ctaAction === "lender_qa" && qaChecked && !hasOpenQa) return null; // BF_CLIENT_QA_CHIP_GATE_v1
              const outbound = m.authorRole === "self";
              const initial = (m.authorName ?? "S").trim().charAt(0).toUpperCase();
              return (
                <div key={m.id} className={`mp-msg-row ${outbound ? "mp-msg-row--out" : "mp-msg-row--in"}`}>
                  {!outbound ? <div className="mp-msg-avatar">{initial}</div> : null}
                  <div className="mp-msg-stack">
                    <div className={`mp-msg-bubble ${outbound ? "mp-msg-bubble--out" : "mp-msg-bubble--in"}`}>
                      <div>{m.body}</div>
                      {m.attachments && m.attachments.length > 0 ? (
                        <div style={{ marginTop: m.body ? 6 : 0, display: "flex", flexDirection: "column", gap: 4 }}>
                          {m.attachments.map((a, i) =>
                            (a.contentType ?? "").startsWith("image/") ? (
                              <a key={i} href={a.dataUrl} target="_blank" rel="noreferrer">
                                <img src={a.dataUrl} alt={a.name} style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, display: "block" }} />
                              </a>
                            ) : (
                              <a key={i} href={a.dataUrl} download={a.name} style={{ fontSize: 13, color: "inherit", textDecoration: "underline" }}>
                                📎 {a.name}
                              </a>
                            ),
                          )}
                        </div>
                      ) : null}
                      {m.ctaLabel && m.ctaAction ? <button className="mp-msg-cta" type="button" onClick={() => handleMessageCta(m.ctaAction)}>{m.ctaLabel}</button> : null}
                    </div>
                  </div>
                  <div className="mp-msg-time">{safeParseDate(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                </div>
              );
            })}
            {/* BF_CLIENT_BLOCK_v322_MINI_PORTAL_REALTIME_v1 — staff typing */}
            {staffTyping && (
              <div style={{ fontSize: 12, color: "#64748b", padding: "4px 0", fontStyle: "italic" }}>
                Staff is typing…
              </div>
            )}
          </div>
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "4px 8px" }}>
              {attachments.map((a, idx) => (
                <span key={idx} style={{ fontSize: 12, padding: "2px 8px", border: "1px solid #cbd6e2", borderRadius: 12, background: "#f9fafb", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  📎 {a.name}
                  <button onClick={() => removeAttachment(idx)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, color: "#64748b" }} aria-label={`Remove ${a.name}`}>✕</button>
                </span>
              ))}
            </div>
          )}
          {/* BF_CLIENT_OFFERS_IN_THREAD_v3 - one bubble per offer. */}
          {offers.length > 0 && (
            <div className="mp-offer-bubbles">
              {offers.map((o) => {
                const expired = isOfferExpired(o.expiresAt);
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={expired ? "mp-offer-bubble mp-offer-bubble--expired" : "mp-offer-bubble"}
                    data-testid="open-offers-btn"
                    onClick={() => setOffersOpen(true)}
                  >
                    <span className="mp-offer-bubble__lender">{o.lenderName}</span>
                    <span className="mp-offer-bubble__amount">
                      {o.amount ? `$${o.amount}` : "Offer"}
                    </span>
                    <span className="mp-offer-bubble__cta">
                      {expired ? "Expired" : "View offer"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mp-thread-card__composer" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <label style={{ cursor: "pointer", padding: "6px 8px", border: "1px solid #cbd6e2", borderRadius: 6, fontSize: 13, background: "#fff" }} title="Attach a file (≤3MB)">
              📎
              <input
                type="file"
                style={{ display: "none" }}
                onChange={(e) => {
                  const fs = Array.from(e.target.files ?? []);
                  for (const f of fs) void stageFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Send a message…" onKeyDown={(e) => { if (e.key === "Enter") void sendMessage(); }} style={{ flex: 1 }} />
            <button onClick={() => void sendMessage()}>Send</button>
          </div>
        </section>
        <aside className="mp-actions">
            {/* BF_CLIENT_BLOCK_53_v1 -- 7-pill 2-col grid; no per-doc cards. */}
            <header className="mp-actions__header">What's Next?</header>
            <div className="mp-actions__chips">
              {ACTION_CHIPS
                .filter((c) => c.id !== "upload" || hasOutstandingDocs)
                // BF_CLIENT_SBA_FORMS_ENTRY_v142
                .filter((c) => c.id !== "sba_forms" || isSbaApplication)
                .filter((c) => c.id !== "cra" || countryIsCanada)
                .filter((c) => (c.id !== "equipment" && c.id !== "realestate") || collateralRelevant)
                .map((c) => (
                <button key={c.id} type="button" className="mp-chip mp-chip--action" onClick={() => onChip(c.id)}>
                  {c.label}
                </button>
              ))}
              {signSession?.status === "ready" && (
                <button type="button" className="mp-chip mp-chip--action" onClick={() => onChip("sign")}>
                  Sign Documents
                </button>
              )}
              {/* BF_CLIENT_BLOCK_v_HIDE_SIGNING_REASON_v1 — never surface the raw
                  signing-readiness status/reason (e.g. "lender_not_finalized") to the
                  client. Those are internal staff-workflow gates, not errors, and the
                  client has no action to take on them. The "Sign Documents" pill above
                  appears on its own once status === "ready". */}
            </div>
            {/* Twilio Voice WebRTC, no tel: link */}
            {/* BF_CLIENT_UI_CLUSTER_2 — inset 16px so Call Us lines up with the chips above. */}
            <div style={{ marginTop: 12, padding: "0 16px" }}>
              {callState === "idle" && (
                <button type="button" className="mp-callus" onClick={() => void startCall()} style={{ width: "100%" }}>
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
                <button type="button" className="mp-hangup" onClick={endCall} style={{ width: "100%" }}>
                  📞 Hang up
                </button>
              )}
              {callState === "ended" && (
                <button type="button" className="mp-callus" onClick={() => setCallState("idle")} style={{ width: "100%" }}>
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
                onUploaded={() => { void loadAll(); }}
              />
            )}
        </aside>
        {/* BF_CLIENT_OFFERS_MODAL_v1 - offers open in a full-width dialog so amounts are never clipped. */}
        {offersOpen && (
          <div className="mp-offers-overlay" role="dialog" aria-modal="true" aria-label="Offers" onClick={() => setOffersOpen(false)}>
            <div className="mp-offers-dialog" onClick={(e) => e.stopPropagation()}>
              <header className="mp-offers-dialog__head">
                <strong>Your offers</strong>
                <button type="button" className="mp-offers-dialog__close" aria-label="Close" onClick={() => setOffersOpen(false)}>&times;</button>
              </header>
              {/* BF_CLIENT_OFFERS_IN_THREAD_v3 - side by side from two up. */}
              <div className={offers.length > 1 ? "mp-offers mp-offers--multi" : "mp-offers"}>
                {offers.map((o) => {
                  const exp = expirationColor(o.expiresAt);
                  const expired = isOfferExpired(o.expiresAt);
                  const expiryMs = o.expiresAt ? (safeParseDate(o.expiresAt).getTime() - Date.now()) : 0;
                  const safeHrs = Math.max(0, Math.floor(expiryMs / 3600000));
                  const days = Math.floor(safeHrs / 24);
                  const hours = safeHrs % 24;
                  return (
                    <article key={o.id} className={`mp-offer mp-offer--${exp}${expired ? " mp-offer--expired" : ""}`}>
                      <header className="mp-offer__head"><strong>{o.lenderName}</strong>{o.recommended ? <span className="mp-offer__badge">Recommended</span> : null}</header>
                      <div className="mp-offer__amount">{o.amount ? `$${o.amount}` : "\u2014"}</div>
                      <div className="mp-offer__subtitle">Offer Amount.</div>
                      <div className="mp-offer__meta">
                        <div className="mp-offer__meta-row-main">{o.rateOrFactor?.includes("%") ? `${o.rateOrFactor} Interest rate` : `${o.rateOrFactor ?? "\u2014"} factor`}</div>
                        <div className="mp-offer__meta-row">{o.term ?? "\u2014"} years | Term</div>
                        <div className="mp-offer__meta-row">{o.paymentFrequency ?? "\u2014"} payment</div>
                      </div>
                      <div className="mp-offer__expires">Expires in {days} days, {hours} hours</div>

                      {/* BF_CLIENT_SIGNED_UPLOAD_PENDING_v5 - outside the
                          accept/pending branch, because signing and returning
                          happens AFTER acceptance, not instead of it. */}
                      <div className="mp-signed-return">
                        Download the term sheet, sign it, and send the signed copy back to us.
                        <div className="mp-signed-return__actions">
                          <button type="button" className="mp-btn mp-btn--ghost" onClick={() => void openTermSheet(o)}>
                            Download term sheet
                          </button>
                          <label className="mp-btn mp-btn--ghost" style={{ cursor: "pointer" }}>
                            {signingOfferId === o.id ? "Sending…" : "Upload signed copy"}
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              style={{ display: "none" }}
                              disabled={signingOfferId !== null}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.currentTarget.value = "";
                                if (f) void uploadSignedTermSheet(o.id, f);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      {expired ? null : o.status === "pending_acceptance" || pendingOfferId === o.id ? (
                        <div className="mp-offer__pending">Sent for staff confirmation. We'll text you when it's ready to sign.</div>
                      ) : (
                        <div className="mp-offer__actions">
                          <button type="button" data-testid="view-pdf-link" className="mp-btn mp-btn--ghost" onClick={() => void openTermSheet(o)}>View PDF</button>
                          <button type="button" data-testid="request-changes-btn" className="mp-btn mp-btn--secondary" onClick={() => void requestChanges(o.id)}>Request Changes</button>
                          <button type="button" data-testid="accept-offer-btn" className="mp-btn mp-btn--primary" onClick={() => void acceptOffer(o.id)}>Accept</button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      {/* BF_CLIENT_BLOCK_v315_MINI_PORTAL_FORM_MODALS_v1 — form modals */}
      {openForm !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Application form"
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
              {/* BF_CLIENT_AUDIT_FIX_v1 -- title removed; form renders its own heading */}
              <div aria-hidden="true" />
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
                  prefill={cmpPrefill}
                  onComplete={() => setOpenForm(null)}
                />
              )}
              {openForm === "cra" && (
                <CraAuthorizationForm
                  applicationId={applicationId}
                  onComplete={() => setOpenForm(null)}
                />
              )}
              {openForm === "flinks" && (
                <FlinksConnectForm
                  applicationId={applicationId}
                  onComplete={() => setOpenForm(null)}
                />
              )}
              {openForm === "debt" && (
                <DebtStackForm
                  applicationId={applicationId}
                  prefill={cmpPrefill}
                  onComplete={() => setOpenForm(null)}
                />
              )}
              {openForm === "realestate" && (
                <RealEstateCollateralForm
                  applicationId={applicationId}
                  prefill={cmpPrefill}
                  onComplete={() => setOpenForm(null)}
                />
              )}
              {openForm === "equipment" && (
                <EquipmentCollateralForm
                  applicationId={applicationId}
                  prefill={cmpPrefill}
                  onComplete={() => setOpenForm(null)}
                />
              )}
              {openForm === "advisors" && (
                <AdvisorsForm
                  applicationId={applicationId}
                  onComplete={() => setOpenForm(null)}
                />
              )}
              {openForm === "lender_qa" && (
                <LenderQaForm
                  applicationId={applicationId}
                  onComplete={() => {
                    setOpenForm(null);
                    void (async () => {
                      try {
                        const r = await apiCall<{ questions?: unknown[] }>(`/api/portal/applications/${encodeURIComponent(applicationId)}/qa/open`).catch((): null => null);
                        setHasOpenQa(Array.isArray((r as any)?.questions) && (r as any).questions.length > 0);
                        setQaChecked(true);
                      } catch {}
                    })();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {showSign && (
        <div role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) { setShowSign(false); void markSigningComplete(); } }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", color: "#0b1320", borderRadius: 12, maxWidth: 900, width: "100%", height: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Sign Your Documents</div>
              <button type="button" onClick={() => { setShowSign(false); void markSigningComplete(); }} aria-label="Close" style={{ background: "transparent", border: 0, fontSize: 24, cursor: "pointer", color: "#64748b", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {signLoading && !signSession && <div style={{ padding: 24 }}>Loading…</div>}
              {signSession?.status === "ready" && signSession.url && (
                <iframe title="Sign documents" src={signSession.url} style={{ border: 0, width: "100%", height: "100%" }} />
              )}
              {signSession?.status === "signed" && <div style={{ padding: 24 }}>✓ Your documents are signed. Thank you!</div>}
              {/* BF_CLIENT_BLOCK_PNW_ORDER_GATE_v1 - PNW must be signed before app signing */}
              {signSession?.status === "not_ready" && signSession?.reason === "pnw_not_signed" && <div style={{ padding: 24 }}>Please sign your Personal Net worth Statement</div>}
              {signSession?.status === "not_ready" && signSession?.reason !== "pnw_not_signed" && <div style={{ padding: 24 }}>Your documents aren’t ready to sign yet — we’ll text you the moment they are.</div>}
              {signSession?.status === "stub" && <div style={{ padding: 24 }}>Signing isn’t enabled in this environment yet.</div>}
              {signSession?.status === "error" && <div style={{ padding: 24 }}>We couldn’t load your signing session. Please try again shortly.</div>}
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
    </>
  );
}
