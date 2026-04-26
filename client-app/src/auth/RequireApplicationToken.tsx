import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useApplicationStore } from "@/state/useApplicationStore";
import { OfflineStore } from "@/state/offline";

export function RequireApplicationToken({ children }: PropsWithChildren) {
  const { app } = useApplicationStore();
  const cached = OfflineStore.load() as { applicationToken?: string | null } | null;

  const tokenInMemory = app.applicationToken;
  const tokenInCache = cached?.applicationToken;
  const willPass = Boolean(tokenInMemory) || Boolean(tokenInCache);

  if (typeof window !== "undefined") {
    console.log("[guard] RequireApplicationToken", {
      pathname: window.location.pathname,
      tokenInMemory: tokenInMemory ?? null,
      tokenInCache: tokenInCache ?? null,
      willPass,
    });
  }

  if (!willPass) {
    return <Navigate to="/otp" replace />;
  }

  return <>{children}</>;
}
