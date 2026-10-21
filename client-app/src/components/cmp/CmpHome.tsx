// BF_CLIENT_v802_PHONE_UI - the phone client portal's header and Home cards.
import { useEffect, useState } from "react";
import { Icon, BorealMark } from "./icons";
import { type Advisor, advisorName, initials, shortStageLabel } from "./cmpData";
import "./cmp.css";

// BF_CLIENT_v828_FINISH_IMPORTED_FILE - readyToFinish: a file Boreal prepared for the client from documents they
// gave a broker or lender. The client finishes it here; Continue opens the wizard pre-filled.
export type SwitcherApp = { id: string; business: string; product: string; amount: string; stage: string; signatureNeeded: boolean; notFinished: boolean; lastSaved: string; readyToFinish?: boolean };

const PRODUCT_LABELS: Record<string, string> = {
  EQUIPMENT_FINANCING: "Equipment financing", EQUIPMENT_FINANCE: "Equipment financing", EQUIPMENT: "Equipment financing",
  LINE_OF_CREDIT: "Line of credit", LOC: "Line of credit", TERM_LOAN: "Term loan", WORKING_CAPITAL: "Working capital",
  INVOICE_FACTORING: "Invoice factoring", FACTORING: "Invoice factoring", STARTUP: "Start-up financing", SBA: "SBA loan",
  // BF_CLIENT_v805_PHONE_FIXES - the switcher showed "Sba government" and "Standard".
  SBA_GOVERNMENT: "SBA loan", SBA_LOAN: "SBA loan", GOVERNMENT: "Government-backed loan", STANDARD: "Business financing",
  MEDIA: "Media financing", PURCHASE_ORDER: "Purchase order financing", ABL: "Asset-based lending", ASSET_BASED_LENDING: "Asset-based lending",
};

export function productLabel(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "Application";
  const key = s.toUpperCase().replace(/[\s-]+/g, "_");
  return PRODUCT_LABELS[key] ?? s.replace(/[_-]+/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function toSwitcherApp(a: any): SwitcherApp {
  const amt = Number(a?.requested_amount ?? 0);
  const stageRaw = String(a?.pipeline_state ?? "").trim();
  // BF_CLIENT_v805_PHONE_FIXES - an application never submitted (draft, or no submitted_at) is "Not finished"
  // and can be continued; its placeholder name ("Draft application") is not shown as a business.
  const notFinished = /^draft$/i.test(stageRaw) || (a?.submitted_at == null && "submitted_at" in (a ?? {}));
  const rawName = String(a?.business_name ?? a?.businessName ?? a?.legal_business_name ?? "").trim();
  const saved = Date.parse(String(a?.updated_at ?? a?.created_at ?? ""));
  return {
    id: String(a?.id ?? ""),
    business: rawName && !/^draft application$/i.test(rawName) ? rawName : notFinished ? "Unfinished application" : "Your business",
    product: productLabel(a?.product_category),
    amount: Number.isFinite(amt) && amt > 0 ? "$" + amt.toLocaleString("en-CA") : "",
    stage: notFinished ? "Not finished" : shortStageLabel(stageRaw),
    signatureNeeded: a?.signature_needed === true,
    notFinished,
    lastSaved: Number.isFinite(saved) ? new Date(saved).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "",
    readyToFinish: a?.ready_to_finish === true,
  };
}

/** Item 1 - a slim white header with the business name and the stage. Tapping the name switches applications. */
export function CmpHeader({ business, stage, canSwitch, onSwitch }: { business: string; stage: string; canSwitch: boolean; onSwitch: () => void }) {
  return (
    <header className="cmpx-head" role="banner" data-testid="cmp-header">
      <BorealMark className="cmpx-head__mark" />
      <button type="button" className={"cmpx-head__title" + (canSwitch ? " cmpx-head__title--switch" : "")} disabled={!canSwitch}
        onClick={canSwitch ? onSwitch : undefined} aria-haspopup={canSwitch ? "dialog" : undefined} aria-label={canSwitch ? business + ", switch application" : undefined}
        data-testid="cmp-header-title">
        <span className="cmpx-head__biz">{business}</span>
        {canSwitch ? <Icon name="chevronDown" size={18} /> : null}
      </button>
      {stage ? <span className="cmpx-head__stage" data-testid="cmp-header-stage">{stage}</span> : null}
    </header>
  );
}

export function Sheet({ title, onClose, children, testId, panelClassName }: { title: string; onClose: () => void; children: React.ReactNode; testId?: string; panelClassName?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="cmpx-sheet" role="dialog" aria-modal="true" aria-label={title} data-testid={testId} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={"cmpx-sheet__panel" + (panelClassName ? " " + panelClassName : "")}>
        <div className="cmpx-sheet__grip" aria-hidden="true" />
        <div className="cmpx-sheet__head">
          <h2 className="cmpx-sheet__title">{title}</h2>
          <button type="button" className="cmpx-sheet__close" aria-label="Close" onClick={onClose}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Item 12 - business name large, product and amount underneath. */
// BF_CLIENT_v839_REMOVE_UNFINISHED - onRemove: takes an unfinished application the client started off their list.
export function AppSwitcherSheet({ apps, currentId, onPick, onContinue, onRemove, onClose }: { apps: SwitcherApp[]; currentId: string; onPick: (id: string) => void; onContinue?: (id: string) => void; onRemove?: (id: string) => void; onClose: () => void }) {
  return (
    <Sheet title="Your applications" onClose={onClose} testId="cmp-app-switcher">
      <ul className="cmpx-apps">
        {apps.map((a) => (
          <li key={a.id}>
            {a.notFinished && onContinue ? (
              // BF_CLIENT_v805_PHONE_FIXES - not submitted yet: say so, and offer to carry on in the application.
              <div className="cmpx-app" data-testid="cmp-app-unfinished">
                <span style={{ minWidth: 0 }}>
                  <span className="cmpx-app__biz" style={{ display: "block" }}>{a.business}</span>
                  <span className="cmpx-app__sub" style={{ display: "block" }}>{[a.product, a.amount].filter(Boolean).join(" \u00b7 ")}</span>
                  <span className="cmpx-app__sub" style={{ display: "block" }}>{a.readyToFinish ? "Ready for you to check and finish" : ["Not finished", a.lastSaved ? "last saved " + a.lastSaved : ""].filter(Boolean).join(" \u00b7 ")}</span>
                </span>
                <span className="cmpx-app__actions">
                  {onRemove && !a.readyToFinish ? (
                    <button type="button" className="cmpx-app__remove" onClick={() => onRemove(a.id)} aria-label={"Remove " + a.business} data-testid="cmp-app-remove">Remove</button>
                  ) : null}
                  <button type="button" className="cmpx-app__go" onClick={() => onContinue(a.id)}>Continue</button>
                </span>
              </div>
            ) : (
            <button type="button" className="cmpx-app" onClick={() => onPick(a.id)} aria-current={a.id === currentId ? "true" : undefined}>
              <span style={{ minWidth: 0 }}>
                <span className="cmpx-app__biz" style={{ display: "block" }}>{a.business}</span>
                <span className="cmpx-app__sub" style={{ display: "block" }}>{[a.product, a.amount].filter(Boolean).join(" \u00b7 ")}{a.stage ? " \u2014 " + a.stage : ""}</span>
                {a.signatureNeeded ? <span className="cmpx-app__flag">Signature needed</span> : null}
              </span>
              {a.id === currentId ? <span className="cmpx-app__tick" aria-label="Open now"><Icon name="check" /></span> : null}
            </button>
            )}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/** Item 4 - greeting, and the advisor with Call, Message and Book. */
export function CmpHello({ firstName, advisor, onCall, onMessage, onBook }: { firstName: string; advisor: Advisor | null; onCall: () => void; onMessage?: () => void; onBook: () => void }) {
  const name = advisorName(advisor);
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <section data-cmp-tab="home" data-testid="cmp-hello">
      <div className="cmpx-hello">
        <h1 className="cmpx-hello__hi">{firstName ? "Hi " + firstName : "Welcome back"}</h1>
      </div>
      <div className="cmpx-card" data-testid="cmp-advisor">
        <div className="cmpx-advisor">
          {advisor?.photoUrl && !photoFailed
            ? <img className="cmpx-avatar" src={advisor.photoUrl} alt="" onError={() => setPhotoFailed(true)} />
            : name
              ? <span className="cmpx-avatar" aria-hidden="true">{initials(name)}</span>
              : <span className="cmpx-avatar cmpx-avatar--brand" aria-hidden="true"><BorealMark /></span>}
          <div style={{ minWidth: 0 }}>
            {/* BF_CLIENT_v805_PHONE_FIXES - no advisor assigned yet: the Boreal team, with the Boreal logo. */}
            <div className="cmpx-eyebrow">{name ? "Your advisor" : "Your team"}</div>
            <div className="cmpx-advisor__name">{name || "Boreal Financial team"}</div>
          </div>
        </div>
        {/* BF_CLIENT_v808_WIDE_HOME - no Message button where Chat is already open beside Home (wide screens). */}
        <div className={"cmpx-advisor__actions" + (onMessage ? "" : " cmpx-advisor__actions--two")}>
          <button type="button" className="cmpx-btn" onClick={onCall} data-testid="cmp-advisor-call"><Icon name="phone" />Call</button>
          {onMessage ? <button type="button" className="cmpx-btn" onClick={onMessage} data-testid="cmp-advisor-message"><Icon name="chat" />Message</button> : null}
          <button type="button" className="cmpx-btn" onClick={onBook} data-testid="cmp-advisor-book"><Icon name="calendar" />Book</button>
        </div>
      </div>
    </section>
  );
}

/** Items 10 and 11 - the stage as a big card with a progress bar, what happens next, and "all caught up". */
export function CmpStatusCard({ stageLabel, step, total, next, caughtUp }: { stageLabel: string; step: number; total: number; next: string; caughtUp: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round((step / total) * 100)));
  return (
    <section className="cmpx-card" data-cmp-tab="home" data-testid="cmp-status" aria-label="Application status">
      {/* BF_CLIENT_v807_STATUS - a plain question instead of "Status / Step 4 of 6", which told the client nothing. */}
      <h2 className="cmpx-status__title">What stage is your application at?</h2>
      <div className="cmpx-status__stage" data-testid="cmp-status-stage">{stageLabel}</div>
      <div className="cmpx-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step} aria-label={"Step " + step + " of " + total}>
        <div className="cmpx-bar__fill" style={{ width: pct + "%" }} />
      </div>
      {caughtUp ? (
        <div className="cmpx-caught" data-testid="cmp-home-caught-up">
          <Icon name="check" />
          <span>You're all caught up. We have everything we need from you right now.</span>
        </div>
      ) : null}
      <div className="cmpx-status__next" data-testid="cmp-status-next">{next}</div>
    </section>
  );
}

export function CmpOffersCard({ count, bestAmount, onOpen }: { count: number; bestAmount: string; onOpen: () => void }) {
  if (count <= 0) return null;
  return (
    <section className="cmpx-card" data-cmp-tab="home" data-testid="cmp-offers-card">
      <div className="cmpx-eyebrow">{count === 1 ? "Your offer" : "Your offers"}</div>
      {bestAmount ? <div className="cmpx-offers__amount">{count > 1 ? "Up to " : ""}{bestAmount}</div> : null}
      <p className="cmpx-offers__sub">{count === 1 ? "One lender has made you an offer." : count + " lenders have made you offers. Compare them side by side."}</p>
      <button type="button" className="cmpx-btn cmpx-btn--block" onClick={onOpen} data-testid="open-offers-btn">{count === 1 ? "Review the offer" : "Compare offers"}</button>
    </section>
  );
}

/** Item 27 - once funded, ask the client to refer another business owner. */
export function CmpReferCard({ shareUrl }: { shareUrl: string }) {
  const [note, setNote] = useState<string | null>(null);
  const text = "I used Boreal Financial to get business financing. Have a look:";
  const share = async () => {
    setNote(null);
    try {
      const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
      if (typeof nav.share === "function") { await nav.share({ title: "Boreal Financial", text, url: shareUrl }); return; }
    } catch (e) {
      if ((e as { name?: string } | null)?.name === "AbortError") return; // closed the share sheet
    }
    try { await navigator.clipboard.writeText(text + " " + shareUrl); setNote("Link copied. Paste it in a text or email."); }
    catch { setNote("Share this link: " + shareUrl); }
  };
  return (
    <section className="cmpx-card" data-cmp-tab="home" data-testid="cmp-refer">
      <div className="cmpx-eyebrow">Know a business owner?</div>
      <h2 className="cmpx-refer__title">Refer them to Boreal</h2>
      <p className="cmpx-refer__sub">If someone you know needs financing, send them our way. Your advisor will take good care of them.</p>
      <button type="button" className="cmpx-btn cmpx-btn--block" onClick={() => void share()}><Icon name="share" />Share Boreal</button>
      {note ? <div className="cmpx-note" role="status">{note}</div> : null}
    </section>
  );
}
