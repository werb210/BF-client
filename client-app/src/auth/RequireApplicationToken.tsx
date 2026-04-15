import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useApplicationStore } from "@/state/useApplicationStore";
import { OfflineStore } from "@/state/offline";

export function RequireApplicationToken({ children }: PropsWithChildren) {
  const { app } = useApplicationStore();
  const cached = OfflineStore.load();

  if (!app.applicationToken && !cached?.applicationToken) {
    return <Navigate to="/otp" replace />;
  }

  return <>{children}</>;
}
