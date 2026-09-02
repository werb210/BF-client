import { apiRequest } from "@/lib/api";

export type Step = 1 | 3 | 4;
export type StepData = Record<string, any>;

const DRAFT_PREFIX = "client:draft:step:";

// BF_CLIENT_DRAFT_SCOPED_v161
// OtpPage writes the verified number here; Step 1 already reads it for
// phone-based prefill. Before OTP there is no identity, so drafts land under
// "anon" and are adopted on login by the same person who typed them.
export const ANON_DRAFT_SCOPE = "anon";

function normalizePhone(v: unknown): string {
  const digits = String(v ?? "").replace(/[^0-9]/g, "");
  return digits ? digits.slice(-10) : "";
}

export function currentDraftScope(
  storage: Storage | null = typeof window !== "undefined" ? window.sessionStorage : null,
): string {
  try {
    const phone = normalizePhone(storage?.getItem("verified_phone"));
    return phone || ANON_DRAFT_SCOPE;
  } catch {
    return ANON_DRAFT_SCOPE;
  }
}

function getDraftKey(step: Step, scope?: string) {
  return `${DRAFT_PREFIX}${scope ?? currentDraftScope()}:${step}`;
}

// Drafts written before OTP belong to whoever was at the keyboard, and that is
// the person who just verified. Moving them keeps a mid-application OTP from
// wiping what they typed; anything already under the phone wins, because a
// stale anon draft must never overwrite the real one.
export function adoptAnonDrafts(
  scope: string,
  storage: Storage | null = typeof window !== "undefined" ? window.localStorage : null,
) {
  if (!storage || !scope || scope === ANON_DRAFT_SCOPE) return;
  for (const step of [1, 3, 4] as Step[]) {
    try {
      const anonKey = getDraftKey(step, ANON_DRAFT_SCOPE);
      const raw = storage.getItem(anonKey);
      if (!raw) continue;
      if (!storage.getItem(getDraftKey(step, scope))) {
        storage.setItem(getDraftKey(step, scope), raw);
      }
      storage.removeItem(anonKey);
    } catch {
      // A storage failure must not block the applicant.
    }
  }
}

// Everything written under the old unscoped key, from before v161. Left behind
// it would keep leaking to the next person on the device.
export function purgeLegacyDrafts(
  storage: Storage | null = typeof window !== "undefined" ? window.localStorage : null,
) {
  if (!storage) return;
  for (const step of [1, 3, 4]) {
    try {
      storage.removeItem(`${DRAFT_PREFIX}${step}`);
    } catch {}
  }
}

export function saveStepData(
  step: Step,
  data: StepData,
  storage: Storage | null = typeof window !== "undefined" ? window.localStorage : null
) {
  if (!storage) return;
  try {
    storage.setItem(getDraftKey(step), JSON.stringify(data));
  } catch {
    // ignore storage failures
  }
}

export function loadStepData(
  step: Step,
  storage: Storage | null = typeof window !== "undefined" ? window.localStorage : null
): StepData | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(getDraftKey(step));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as StepData;
  } catch {
    return null;
  }
}

export function mergeDraft<T extends Record<string, any>>(current: T, draft: StepData): T {
  const next = { ...current };
  Object.entries(draft).forEach(([key, value]) => {
    if (next[key] === undefined || next[key] === null || next[key] === "") {
      (next as Record<string, any>)[key as string] = value;
    }
  });
  return next;
}

export function clearDraft(
  storage: Storage | null = typeof window !== "undefined" ? window.localStorage : null
) {
  if (!storage) return;
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    keys.forEach((key) => {
      if (key && key.startsWith(DRAFT_PREFIX)) {
        storage.removeItem(key);
      }
    });
  } catch {
    // ignore storage failures
  }
}

function isApplicationTokenStaleError(err: any) {
  const message = String(err?.message ?? "").toLowerCase();
  return (
    err?.status === 410 ||
    err?.code === "application_token_stale" ||
    message.includes("410") ||
    message.includes("application_token_stale")
  );
}

export function clearStaleApplicationSession() {
  try {
    localStorage.removeItem("bf.application.token");
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem("bf.application.draft");
  } catch {
    // ignore
  }

  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }

  if (typeof window !== "undefined") {
    window.location.assign("/apply/step-1?reason=session_expired");
  }
}

export async function patchApplication(id: string, body: unknown) {
  try {
    return await apiRequest(`/api/client/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    if (isApplicationTokenStaleError(err)) {
      clearStaleApplicationSession();
    }
    throw err;
  }
}
