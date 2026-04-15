import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { hasToken } from "@/api/auth";

export function RequireOTP({ children }: PropsWithChildren) {
  if (!hasToken()) {
    return <Navigate to="/otp" replace />;
  }

  return <>{children}</>;
}
