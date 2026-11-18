// BF_CLIENT_EXPIRED_SIGNIN_v1 - when the saved sign-in has expired, the server refuses every client-portal request
// (401) and the portal used to sit there empty: no thread, no tasks, no prompt. If the boot check says "signed out"
// while a sign-in token is still stored and the client is on the portal, drop that token and send them to sign in.
// The saved application is kept (sign-in brings them straight back to it).
export function handleBootSignedOut(
  result: { ok: boolean; reason?: string },
  deps: { hasToken: () => boolean; clearToken: () => void; path: string; redirect: (to: string) => void },
): boolean {
  if (result.ok || result.reason !== "signed_out") return false;
  if (!deps.hasToken()) return false;
  if (!/^\/portal(\/|$)/.test(deps.path)) return false;
  deps.clearToken();
  deps.redirect("/otp");
  return true;
}
