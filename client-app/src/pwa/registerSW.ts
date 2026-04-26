import { Workbox } from "workbox-window";

let wb: Workbox | null = null;

export function registerClientSW(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;
  wb = new Workbox("/sw.js", { scope: "/" });
  wb.addEventListener("waiting", () => {
    window.dispatchEvent(new CustomEvent("bf:sw-update-available"));
  });
  wb.addEventListener("controlling", () => { window.location.reload(); });
  wb.register().catch((err) => {
    console.warn("[bf-client] service worker registration failed:", err);
  });
}

export function applyClientSWUpdate(): void {
  if (!wb) return;
  wb.messageSkipWaiting();
}


// [sw] update check on navigation — keeps the active SW from serving stale chunks
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  let lastPath = window.location.pathname;
  const checkUpdate = () => {
    if (window.location.pathname === lastPath) return;
    lastPath = window.location.pathname;
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.update().catch(() => {});
    });
  };
  window.addEventListener("popstate", checkUpdate);
  // pushState/replaceState don't fire popstate; patch them to trigger an update check.
  const _push = history.pushState.bind(history);
  history.pushState = (data: unknown, unused: string, url?: string | URL | null): void => {
    _push(data, unused, url);
    checkUpdate();
  };
  const _replace = history.replaceState.bind(history);
  history.replaceState = (data: unknown, unused: string, url?: string | URL | null): void => {
    _replace(data, unused, url);
    checkUpdate();
  };
}
