import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { useLocation, useNavigate } from "react-router-dom";
import { parseNativeUrl } from "./deepLinks";
import { collectAndroidShares, isSharedFileUrl, receiveSharedUrl } from "./sharedFiles"; // BF_CLIENT_BLOCK_v550_SHARE_TO_BOREAL

/** Owns native listeners in one mount and removes them as a unit on teardown. */
export function useNativeRuntime(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];
    const add = async () => {
      // BF_CLIENT_COLD_LAUNCH_DEEPLINK_v426 - iOS delivers the URL that launched a
      // terminated app through launch options, never through appUrlOpen. Without
      // this, tapping a link or a push with the app closed landed on "/" and the
      // destination was lost. Read it BEFORE attaching listeners so a live
      // appUrlOpen during startup wins over the stale launch URL.
      try {
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
        if (canGoBack && pathRef.current !== "/portal" && pathRef.current !== "/") navigate(-1);
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
  }, [navigate]);
}
