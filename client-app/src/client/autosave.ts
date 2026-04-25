import { apiRequest } from "@/lib/api";

export type Step = 1 | 3 | 4;
export type StepData = Record<string, any>;

const DRAFT_PREFIX = "client:draft:step:";

function getDraftKey(step: Step) {
  return `${DRAFT_PREFIX}${step}`;
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
