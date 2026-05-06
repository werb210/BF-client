// BF_CLIENT_BLOCK_v157_REQUIRE_OTP_FRESH_PARAM_v1
// When BF-Website's credit-readiness flow hands off to /apply, it now
// appends ?fresh=1 (BF_WEBSITE_BLOCK_v150). RequireOTP recognizes that
// param, clears any stale bf_jwt_token from localStorage, and lets the
// hasToken() check below fail → redirect to /otp. The ?fresh=1 param is
// then consumed (replaced from the URL) so Back navigation doesn't
// re-clear after the user finishes OTP. Direct visitors to /apply
// without ?fresh=1 still skip OTP if they already have a token —
// returning-user UX preserved.
import { useEffect, type PropsWithChildren } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { clearToken, hasToken } from "@/api/auth";

export function RequireOTP({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const fresh = params.get("fresh") === "1";

  // Clear stale token synchronously on mount-with-?fresh=1 so the
  // hasToken() check immediately below sees the cleared state. This
  // runs every time the route mounts with ?fresh=1, which is fine —
  // the param is stripped right after.
  if (fresh) {
    clearToken();
  }

  // Strip ?fresh=1 from the URL so the param doesn't survive the
  // back-button. Done in an effect so React doesn't complain about
  // navigating during render.
  useEffect(() => {
    if (!fresh) return;
    params.delete("fresh");
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "" },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh]);

  if (!hasToken()) {
    return <Navigate to="/otp" replace />;
  }

  return <>{children}</>;
}
