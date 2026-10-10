// BF_CLIENT_CMP_PHONE_TABS_v732 - the client portal on a phone: one section at a time behind a bottom tab bar
// (Home, To do, Chat, More), as approved in the Oct 5 mockup. Computers and iPads keep today's layout. The
// sections themselves are the existing ones; the page only tags them with data-cmp-tab and CSS shows the
// active tab, so nothing remounts when the client switches tabs (the chat keeps its place).
import { useEffect, useState } from "react";
import "./CmpPhone.css";

export type CmpTab = "home" | "todo" | "chat" | "more";
export const PHONE_QUERY = "(max-width: 640px)";

export function usePhoneLayout(): boolean {
  const get = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches;
  const [phone, setPhone] = useState<boolean>(get);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  // Maya's round floating button would sit on the tab bar; on a phone she opens from Chat > Ask Maya.
  // BF_CLIENT_PHONE_POLISH_v751 - while the keyboard is up the tab bar hid the chat box. Hide the bar (and drop the
  // space reserved for it) whenever the visible area shrinks by more than a keyboard's worth.
  useEffect(() => {
    if (!phone || typeof window === "undefined" || !window.visualViewport) return undefined;
    const vv = window.visualViewport;
    const full = { h: window.innerHeight };
    const check = () => {
      full.h = Math.max(full.h, window.innerHeight);
      document.documentElement.classList.toggle("kb-open", vv.height < full.h - 150);
    };
    check();
    vv.addEventListener("resize", check);
    window.addEventListener("focusout", check);
    return () => { vv.removeEventListener("resize", check); window.removeEventListener("focusout", check); document.documentElement.classList.remove("kb-open"); };
  }, [phone]);
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.toggle("cmp-phone-body", phone);
    return () => document.body.classList.remove("cmp-phone-body");
  }, [phone]);
  return phone;
}

const ICONS: Record<CmpTab, JSX.Element> = {
  home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  todo: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" /></>,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
};
const TABS: Array<{ id: CmpTab; label: string }> = [
  { id: "home", label: "Home" },
  { id: "todo", label: "To do" },
  { id: "chat", label: "Chat" },
  { id: "more", label: "More" },
];

export function CmpTabBar({ tab, onTab, todoCount }: { tab: CmpTab; onTab: (t: CmpTab) => void; todoCount: number }) {
  return (
    <nav className="cmp-tabbar" aria-label="Client portal" data-testid="cmp-tabbar">
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <button key={t.id} type="button" className={"cmp-tabbar__tab" + (on ? " cmp-tabbar__tab--on" : "")} aria-current={on ? "page" : undefined}
            data-testid={"cmp-tab-" + t.id} onClick={() => onTab(t.id)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[t.id]}</svg>
            <span>{t.label}</span>
            {t.id === "todo" && todoCount > 0 ? <span className="cmp-tabbar__badge" aria-label={todoCount + " to do"}>{todoCount}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}

/** Chat tab: switch between the Boreal team (this page's chat) and Maya (opens her chat). */
export function CmpChatSwitch() {
  return (
    <div className="cmp-phone-only cmp-chatswitch" role="group" aria-label="Who to talk to" data-cmp-tab="chat">
      <button type="button" className="cmp-chatswitch__btn cmp-chatswitch__btn--on" aria-pressed="true">Boreal team</button>
      <button type="button" className="cmp-chatswitch__btn" aria-pressed="false" data-testid="cmp-ask-maya"
        onClick={() => window.dispatchEvent(new CustomEvent("maya:open", { detail: { mode: "chat" } }))}>Ask Maya</button>
    </div>
  );
}

/** Home tab: the one thing to do next, with a button to the To do tab. */
export function CmpNextStep({ label, remaining, onOpen }: { label: string | null; remaining: number; onOpen: () => void }) {
  if (!label) return null;
  return (
    <section className="cmp-phone-only cmp-nextstep" data-cmp-tab="home" aria-label="Your next step" data-testid="cmp-next-step">
      <div className="cmp-nextstep__eyebrow">YOUR NEXT STEP</div>
      <div className="cmp-nextstep__title">{label}</div>
      {remaining > 1 ? <div className="cmp-nextstep__sub">{remaining - 1} more {remaining - 1 === 1 ? "item" : "items"} after this one.</div> : null}
      <button type="button" className="cmp-nextstep__btn" onClick={onOpen}>Open my to-do list</button>
    </section>
  );
}

// BF_CLIENT_PHONE_POLISH_v751 - bottom of the More tab: account deletion (moved off Home) and the running version,
// so anyone can confirm which build an iPhone, iPad or browser is showing.
export function appBuildLabel(builtAt: string | undefined, sha: string | undefined): string {
  const d = builtAt ? new Date(builtAt) : null;
  const when = d && !Number.isNaN(d.getTime())
    ? d.toLocaleString("en-CA", { timeZone: "America/Edmonton", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
  return [sha ? "build " + sha : "", when].filter(Boolean).join(" · ");
}

export function CmpMoreFooter({ onDeleteAccount }: { onDeleteAccount: () => void }) {
  const [native, setNative] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        if (alive) setNative(`${info.version} (${info.build})`);
      } catch { /* web: no native version */ }
    })();
    return () => { alive = false; };
  }, []);
  const build = appBuildLabel(import.meta.env.VITE_APP_BUILT_AT as string | undefined, import.meta.env.VITE_APP_BUILD_SHA as string | undefined);
  return (
    <div className="cmp-more-footer" data-testid="cmp-more-footer">
      <button type="button" className="cmp-more-footer__delete" onClick={onDeleteAccount}>Delete account</button>
      <div className="cmp-more-footer__version" data-testid="cmp-version">
        {native ? `App ${native}` : "Web app"}{build ? ` · ${build}` : ""}
      </div>
    </div>
  );
}

