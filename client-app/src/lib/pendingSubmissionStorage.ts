const STORAGE_KEY = "bf_pending_submission_v1";
const MAX_AGE = 1000 * 60 * 60 * 24; // 24h

export type PendingSubmission = {
  idempotencyKey: string;
  payload: any;
  createdAt: number;
  retryCount: number;
};

export function savePendingSubmission(data: PendingSubmission) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function clearPendingSubmission() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getPendingSubmission(): PendingSubmission | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PendingSubmission;
    if (!parsed?.idempotencyKey || !parsed?.payload) return null;

    if (Date.now() - parsed.createdAt > MAX_AGE) {
      clearPendingSubmission();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
