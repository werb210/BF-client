import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClientProfileStore } from "../state/clientProfiles";
import { OfflineStore } from "../state/offline";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { clearClientStorage } from "./logout";
import { refreshSessionOnce } from "./sessionRefresh";

export type SessionGuardAction = "noop" | "redirect";

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function getSessionToken() {
  return localStorage.getItem("token");
}

export function assertAuthenticated() {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("AUTH BLOCKED — NO TOKEN");
  }
}

export function resolveSessionGuardAction(options: {
  isOffline: boolean;
  hasAuth: boolean;
  storage?: StorageLike | null;
}): SessionGuardAction {
  if (options.isOffline) {
    return "noop";
  }

  if (options.hasAuth) {
    return "noop";
  }

  return "redirect";
}

function getSessionRequirement(pathname: string, search: string): { hasAuth: boolean; redirectTo: string } {
  if (pathname.startsWith("/status")) {
    const token = new URLSearchParams(search).get("token") || "";
    return {
      hasAuth: Boolean(token) && ClientProfileStore.hasPortalSession(token),
      redirectTo: "/portal",
    };
  }

  if (pathname.startsWith("/apply/step-")) {
    const step = Number(pathname.replace("/apply/step-", ""));
    if (!Number.isNaN(step) && step > 1) {
      const cached = OfflineStore.load();
      return {
        hasAuth: Boolean(cached?.applicationToken),
        redirectTo: "/apply/step-1",
      };
    }
  }

  return { hasAuth: true, redirectTo: "" };
}

export function useSessionGuard(): void {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOffline } = useNetworkStatus();
  const [ready, setReady] = useState(false);
  const lastRefreshAt = useRef(0);

  const guard = useMemo(
    () => getSessionRequirement(location.pathname, location.search),
    [location.pathname, location.search]
  );

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const action = resolveSessionGuardAction({
      isOffline,
      hasAuth: guard.hasAuth,
    });

    if (action === "redirect" && guard.redirectTo) {
      clearClientStorage();
      navigate(guard.redirectTo, { replace: true });
    }
  }, [guard.hasAuth, guard.redirectTo, isOffline, navigate, ready]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isOffline) return;
    if (!guard.hasAuth) return;

    const minIntervalMs = 30_000;
    const revalidate = () => {
      if (typeof document !== "undefined") {
        if (document.visibilityState && document.visibilityState !== "visible") {
          return;
        }
      }
      const now = Date.now();
      if (now - lastRefreshAt.current < minIntervalMs) return;
      lastRefreshAt.current = now;
      void refreshSessionOnce();
    };

    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [guard.hasAuth, isOffline]);
}

export function SessionGuard(): null {
  useSessionGuard();
  return null;
}
