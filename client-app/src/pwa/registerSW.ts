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
