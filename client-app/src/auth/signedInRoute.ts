// BF_CLIENT_v799_SIGNED_IN_ROUTE
// Where a signed-in client lands. A text-code sign-in asks the server for the client's application
// (GET /api/client/applications/by-phone) and opens it. Opening the app with a saved session, or Face ID,
// only read this device's local memory, which is empty on a new device, after a reinstall or when the
// application was made on another device - so a client with a live application landed on Step 1 until
// they signed out and back in with a text code. All three now ask the server first; the local memory
// is the fallback when the server can't be reached.
import { signedInDestination } from "@/native/useLeaveIfSignedIn";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";

export async function resolveSignedInRoute(token: string, timeoutMs = 5000): Promise<string> {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const r = await fetch(API_BASE + "/api/client/applications/by-phone", {
      method: "GET",
      headers: { Authorization: "Bearer " + token },
      signal: ctrl?.signal,
    });
    if (r.ok) {
      const body = await r.json().catch(() => ({} as any));
      const id = body?.application?.id;
      if (body?.found && id) return "/application/" + String(id);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[sign-in] application lookup failed; using this device's memory", err);
  } finally {
    if (timer) clearTimeout(timer);
  }
  return signedInDestination(token);
}
