import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { useLocation, useNavigate } from "react-router-dom";
import { parseNativeUrl } from "./deepLinks";
import { collectAndroidShares, isSharedFileUrl, receiveSharedUrl } from "./sharedFiles"; // BF_CLIENT_BLOCK_v550_SHARE_TO_BOREAL

// BF_CLIENT_v801_LAUNCH_URL_ONCE - the link that opened the app is followed once per launch. useNavigate()
// returns a new function on every screen change, so this effect re-ran after every navigation and read the
// launch link again - iOS keeps the last link the app was opened with - and sent the client straight back
// to it. Tapping New Application in the portal went to Step 1 and bounced back to the portal Home.
let launchUrlHandled = false;
export function __resetLaunchUrlForTests(): void { launchUrlHandled = false; }

/** Owns native listeners in one mount and removes them as a unit on teardown. */
export function useNativeRuntime(): void {
  const navigateNow = useNavigate();
  const navigateRef = useRef(navigateNow);
  navigateRef.current = navigateNow;
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const navigate: (to: string | number, opts?: { replace?: boolean }) => void = (to, opts) =>
      typeof to === "number" ? navigateRef.current(to) : navigateRef.current(to, opts);
    const handles: Array<{ remove: () => Promise<void> }> = [];
    const add = async () => {
      // BF_CLIENT_COLD_LAUNCH_DEEPLINK_v426 - iOS delivers the URL that launched a
      // terminated app through launch options, never through appUrlOpen. Without
      // this, tapping a link or a push with the app closed landed on "/" and the
      // destination was lost. Read it BEFORE attaching listeners so a live
      // appUrlOpen during startup wins over the stale launch URL.
      try {
        if (launchUrlHandled) throw new Error("launch link already followed");
        launchUrlHandled = true;
        const launch = await CapacitorApp.getLaunchUrl();
        const route = launch?.url ? parseNativeUrl(launch.url) : null;
        // Only redirect when it actually resolves somewhere - parseNativeUrl
        // returns the fallback route for anything it does not recognise, and
        // forcing that would fight the app's own initial route.
        if (launch?.url && isSharedFileUrl(launch.url)) void receiveSharedUrl(launch.url);
        else if (!disposed && route && route !== pathRef.current && launch?.url) {
          navigate(route, { replace: true });
        }
      } catch {
        /* no launch URL - ordinary start */
      }
      handles.push(await CapacitorApp.addListener("appUrlOpen", ({ url }) => (isSharedFileUrl(url) ? void receiveSharedUrl(url) : navigate(parseNativeUrl(url)))));
      void collectAndroidShares();
      handles.push(await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        const modal = document.querySelector<HTMLElement>('[role="dialog"], [aria-modal="true"]');
        const close = modal?.querySelector<HTMLElement>('[aria-label*="Close" i], [data-dismiss]');
        if (close) return close.click();
        // BF_CLIENT_v807_ANDROID - in the client portal, Back first returns to Home from Chat, More or Settings
        // (the portal handles "boreal:back"), and on Home it puts the app in the background instead of going back
        // to the sign-in screen.
        const portal = pathRef.current === "/portal" || pathRef.current.startsWith("/application/");
        if (portal) {
          const handled = !window.dispatchEvent(new CustomEvent("boreal:back", { cancelable: true }));
          if (!handled) void CapacitorApp.minimizeApp();
          return;
        }
        if (canGoBack && pathRef.current !== "/") navigate(-1);
        else if (pathRef.current === "/") void CapacitorApp.exitApp();
      }));
      handles.push(await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        document.documentElement.classList.toggle("native-backgrounded", !isActive);
        if (isActive) { window.dispatchEvent(new Event("boreal:native-resume")); void collectAndroidShares(); }
        else window.dispatchEvent(new Event("boreal:native-pause")); // BF_CLIENT_BACKGROUND_UPLOAD_v307
      }));
      handles.push(await Network.addListener("networkStatusChange", ({ connected }) => {
        window.dispatchEvent(new CustomEvent("boreal:native-network", { detail: { connected } }));
      }));
      if (disposed) await Promise.all(handles.map((handle) => handle.remove()));
    };
    void add();
    return () => {
      disposed = true;
      void Promise.all(handles.splice(0).map((handle) => handle.remove()));
    };
  }, []); // BF_CLIENT_v801_LAUNCH_URL_ONCE - once per mount; navigateRef always holds the current navigate
}
