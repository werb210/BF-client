// BF_CLIENT_CMP_PHONE_TABS_v732 - the client portal on a phone: one section at a time behind a bottom tab bar
// (Home, Chat, More, Settings since v802), as approved in the Oct 5 mockup. Computers and iPads keep today's layout. The
// sections themselves are the existing ones; the page only tags them with data-cmp-tab and CSS shows the
// active tab, so nothing remounts when the client switches tabs (the chat keeps its place).
import { useEffect, useState } from "react";
import "./CmpPhone.css";

// BF_CLIENT_v802_PHONE_UI - To do is part of Home now (Home carries the to-do badge): Home, Chat, More, Settings.
export type CmpTab = "home" | "chat" | "more" | "settings";
export const PHONE_QUERY = "(max-width: 640px)";

/** True on a phone-width screen. No side effects (the wizard uses it too). */
export function useIsPhoneWidth(): boolean {
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
  return phone;
}

// BF_CLIENT_v807_TABLET - one design on every screen. Phones (up to 640px) and tablets held upright (641-1023px)
// show one section at a time with the bottom tabs; tablets in landscape and computers (1024px and up) show Home
// and Chat side by side with a rail on the left for Home, More and Settings.
export type CmpMode = "phone" | "tablet" | "wide";
export const WIDE_QUERY = "(min-width: 1024px)";
export function cmpModeNow(): CmpMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "phone";
  if (window.matchMedia(PHONE_QUERY).matches) return "phone";
  return window.matchMedia(WIDE_QUERY).matches ? "wide" : "tablet";
}
export function useCmpMode(): CmpMode {
  const [mode, setMode] = useState<CmpMode>(cmpModeNow);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const on = () => setMode(cmpModeNow());
    on();
    const qs = [window.matchMedia(PHONE_QUERY), window.matchMedia(WIDE_QUERY)];
    qs.forEach((q) => q.addEventListener?.("change", on));
    return () => qs.forEach((q) => q.removeEventListener?.("change", on));
  }, []);
  return mode;
}

/** BF_CLIENT_v807_TABLET - the client portal's new design is used at every width now (it was phones only). */
export function usePhoneLayout(): boolean {
  const phone = true;
  // Maya's round floating button would sit on the tab bar; on a phone she opens from Chat > Ask Maya.
  // BF_CLIENT_PHONE_TABS_v752 - the tab bar is no longer hidden while the keyboard is up: the app shrinks above the
  // keyboard (Keyboard resize "native" in capacitor.config.ts), so the tabs stay reachable from Chat.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.toggle("cmp-phone-body", phone);
    return () => document.body.classList.remove("cmp-phone-body");
  }, [phone]);
  return phone;
}

const ICONS: Record<CmpTab, JSX.Element> = {
  home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
};
const TABS: Array<{ id: CmpTab; label: string }> = [
  { id: "home", label: "Home" },
  { id: "chat", label: "Chat" },
  { id: "more", label: "More" },
  { id: "settings", label: "Settings" },
];

export function CmpTabBar({ tab, onTab, todoCount, mode = "phone" }: { tab: CmpTab; onTab: (t: CmpTab) => void; todoCount: number; mode?: CmpMode }) {
  // BF_CLIENT_v807_TABLET - wide screens: a rail on the left, and no Chat tab (Chat is always open on the right).
  const tabs = mode === "wide" ? TABS.filter((t) => t.id !== "chat") : TABS;
  return (
    <nav className={"cmp-tabbar" + (mode === "wide" ? " cmp-tabbar--rail" : "")} aria-label="Client portal" data-testid="cmp-tabbar">
      {tabs.map((t) => {
        const on = t.id === tab;
        return (
          <button key={t.id} type="button" className={"cmp-tabbar__tab" + (on ? " cmp-tabbar__tab--on" : "")} aria-current={on ? "page" : undefined}
            data-testid={"cmp-tab-" + t.id} onClick={() => onTab(t.id)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[t.id]}</svg>
            <span>{t.label}</span>
            {t.id === "home" && todoCount > 0 ? <span className="cmp-tabbar__badge" aria-label={todoCount + " to do"}>{todoCount}</span> : null}
          </button>
        );
      })}
    </nav>
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
      <div className="cmp-more-footer__version" data-testid="cmp-version">
        {native ? `App ${native}` : "Web app"}{build ? ` · ${build}` : ""}
      </div>
      {/* BF_CLIENT_v802_SETTINGS - Delete account is the last thing on the page, in plain text. */}
      <button type="button" className="cmp-more-footer__delete" onClick={onDeleteAccount}>Delete account</button>
    </div>
  );
}

