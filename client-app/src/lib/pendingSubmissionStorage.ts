import { safeStorage } from "@/lib/storage";

const STORAGE_KEY = "bf_pending_submission";

export function savePendingSubmission(data: unknown) {
  const payload = JSON.stringify(data);
  try {
    safeStorage.setLocal(STORAGE_KEY, payload);
  } catch {
    safeStorage.setSession(STORAGE_KEY, payload);
  }
}

export function getPendingSubmission<T = Record<string, unknown>>(): T | null {
  const raw =
    safeStorage.getLocal(STORAGE_KEY) ?? safeStorage.getSession(STORAGE_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearPendingSubmission() {
  safeStorage.removeLocal(STORAGE_KEY);
  safeStorage.removeSession(STORAGE_KEY);
}
