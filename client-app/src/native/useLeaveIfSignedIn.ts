// BF_CLIENT_LOCK_ORDER_v364 - in the app, a valid session (for example one Face ID
// just renewed) goes where a text-code sign-in would: the portal once an
// application is submitted, otherwise the application. The website is unchanged.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { getToken } from "@/auth/token";
import { resolveOtpNextStep } from "@/auth/otp";
import { ClientProfileStore } from "@/state/clientProfiles";
import { phoneFromToken } from "@/native/deviceSignIn";
import { tokenExpired } from "@/native/useBiometricLock";

export function signedInDestination(token: string): string {
  const phone = phoneFromToken(token) || ClientProfileStore.getLastUsedPhone();
  const next = resolveOtpNextStep(phone ? ClientProfileStore.getProfile(phone) : null);
  return next.action === "portal" ? "/portal" : "/apply/step-1";
}

export function useLeaveIfSignedIn(): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const leave = () => {
      const token = getToken();
      if (token && !tokenExpired(token)) navigate(signedInDestination(token), { replace: true });
    };
    leave();
    window.addEventListener("boreal:session-renewed", leave);
    return () => window.removeEventListener("boreal:session-renewed", leave);
  }, [navigate]);
}
