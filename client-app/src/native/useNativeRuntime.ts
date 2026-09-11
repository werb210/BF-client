import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { useLocation, useNavigate } from "react-router-dom";
import { parseNativeUrl } from "./deepLinks";

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
      handles.push(await CapacitorApp.addListener("appUrlOpen", ({ url }) => navigate(parseNativeUrl(url))));
      handles.push(await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        const modal = document.querySelector<HTMLElement>('[role="dialog"], [aria-modal="true"]');
        const close = modal?.querySelector<HTMLElement>('[aria-label*="Close" i], [data-dismiss]');
        if (close) return close.click();
        if (canGoBack && pathRef.current !== "/portal" && pathRef.current !== "/") navigate(-1);
        else if (pathRef.current === "/") void CapacitorApp.exitApp();
      }));
      handles.push(await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        document.documentElement.classList.toggle("native-backgrounded", !isActive);
        if (isActive) window.dispatchEvent(new Event("boreal:native-resume"));
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
