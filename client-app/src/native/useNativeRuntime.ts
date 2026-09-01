import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { PushNotifications } from "@capacitor/push-notifications";
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
      handles.push(await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        navigate(parseNativeUrl(notification.data?.url));
      }));
      handles.push(await PushNotifications.addListener("registration", ({ value }) => {
        window.dispatchEvent(new CustomEvent("boreal:push-token", { detail: { token: value } }));
      }));
      handles.push(await PushNotifications.addListener("registrationError", (error) => {
        console.error("Native push registration failed", error);
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
