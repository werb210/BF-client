import { ENV } from "@/env";
import { clearApplicationToken, getApplicationToken } from "@/auth/applicationToken";
import { getToken } from "@/auth/token"; // BF_CLIENT_v800_BOOT_CHECK_AUTH

const APPLICATION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FULL_DRAFT_KEYS = [
  "bf_application_token",
  "bf_application_pending_submit",
  "boreal_session_id",
  "applicationToken",
  "application_state",
  "application_data",
  "boreal_app_cache",
  "boreal_client_draft",
  "boreal_draft",
  "client_backup",
  "stale-token",
];

const PREFIXED_DRAFT_KEYS = ["client:draft:", "client:step:"];

export function clearAllApplicationDrafts(): void {
  if (typeof window === "undefined") return;
  clearApplicationToken();
  try {
    for (const k of FULL_DRAFT_KEYS) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }

    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (PREFIXED_DRAFT_KEYS.some((p) => key.startsWith(p))) toRemove.push(key);
    }
    for (const k of toRemove) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }
  } catch {}
}

export function isApplicationIdShape(v: unknown): boolean {
  return typeof v === "string" && APPLICATION_ID_RE.test(v);
}

export interface ValidateBootTokenOptions {
  fetchImpl?: typeof fetch;
  apiBase?: string;
  redirect?: (path: string) => void;
}

export async function validateBootToken(
  options: ValidateBootTokenOptions = {},
): Promise<{ ok: true } | { ok: false; reason: "stale" | "no_token" | "invalid_shape" | "network" | "signed_out" }> {
  if (typeof window === "undefined") return { ok: false, reason: "no_token" };

  const stored = (() => {
    try {
      return getApplicationToken();
    } catch {
      return null;
    }
  })();

  if (!stored) return { ok: false, reason: "no_token" };
  if (!isApplicationIdShape(stored)) {
    clearAllApplicationDrafts();
    return { ok: false, reason: "invalid_shape" };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const apiBase = options.apiBase ?? ENV.API_BASE ?? "https://server.boreal.financial";
  const url = `${apiBase}/api/client/application/${encodeURIComponent(stored)}/status`;

  let res: Response;
  try {
    // BF_CLIENT_v800_BOOT_CHECK_AUTH - the status check needs the client's sign-in token since
    // BF-Server v784 (only the owner may read an application). Sent without it, every launch got
    // a 401, which this check read as "expired": it wiped the saved application and sent a
    // signed-in client with a live application to Step 1.
    const clientToken = (() => { try { return getToken(); } catch { return null; } })();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (clientToken) headers.Authorization = "Bearer " + clientToken;
    res = await fetchImpl(url, {
      method: "GET",
      headers,
      credentials: "include",
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (res.ok) return { ok: true };

  // BF_CLIENT_v800_BOOT_CHECK_AUTH - only a missing or closed application is stale. 401/403 mean
  // "not signed in as its owner right now", which sign-in handles; the saved application is kept.
  if (res.status === 401 || res.status === 403) return { ok: false, reason: "signed_out" };
  const stale = res.status === 404 || res.status === 410;
  if (!stale) return { ok: true };

  clearAllApplicationDrafts();

  try {
    sessionStorage.setItem(
      "boreal_toast_message",
      "Your previous application expired. Please start again.",
    );
  } catch {}

  try {
    window.dispatchEvent(
      new CustomEvent("boreal:toast", {
        detail: { type: "warning", message: "Your previous application expired. Please start again." },
      }),
    );
  } catch {}

  const redirect =
    options.redirect ??
    ((path: string) => {
      try {
        window.location.assign(path);
      } catch {}
      try {
        window.history.replaceState({}, "", path);
      } catch {}
    });
  redirect("/apply/step-1");

  return { ok: false, reason: "stale" };
}
