import { clearToken, getToken, setToken } from "./token"

// BF_CLIENT_BLOCK_v283_SESSION_REFRESH_FIX_v1
// Pre-fix this POSTed to /api/auth/refresh which DOES NOT EXIST on
// BF-Server (verified: server has /api/client/session/refresh but that
// reads express-session and returns {success, session}, NOT a JWT in
// {data: {token}} shape; and /api/auth/* has no /refresh route at all).
// The pre-fix fetch silently 404'd, !res.ok cleared the token, and
// sessionGuard's focus/visibilitychange listener (sessionGuard.ts:123)
// then booted the user out every time they tabbed back to the wizard.
// Since BF-Server has no JWT rotation endpoint and adding one is a
// separate cross-repo change, this fix downgrades refreshSession to a
// token-validity ping against GET /api/auth/me (which is requireAuth-
// gated). If the existing token still verifies, return true and keep it
// in storage; if it doesn't, clear and force re-OTP. No new token is
// minted -- when the existing JWT eventually expires the user goes back
// through OTP, but they stop being booted mid-session on every tab focus.
let refreshPromise: Promise<boolean> | null = null

export async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  const token = getToken()
  if (!token) return false

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })

      if (!res.ok) {
        clearToken()
        return false
      }

      // Token still valid -- keep using it. Don't rotate (no rotation
      // endpoint exists). setToken with the current token is a no-op but
      // keeps the call shape symmetrical if a real refresh lands later.
      setToken(token)
      return true
    } catch {
      clearToken()
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}
