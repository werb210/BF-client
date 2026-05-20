// BF_CLIENT_BLOCK_v76_FORM_RESPONSE_QUEUE_AND_LP_CACHE_v1
// Offline + retry queue for PUT /api/portal/applications/:id/form-responses/:docType.
// Structurally identical to uploadQueue.ts (the upload-later queue for documents);
// the form-response payload is plain JSON so this version stores it directly
// rather than base64-encoding bytes. Drained by formResponseQueueWatcher on
// boot, "online", and a 30s tick.
import { ENV } from "@/env";
import { getToken } from "@/auth/token";

const DB_NAME = "bf-form-response-queue";
const STORE_NAME = "form_responses";
const DB_VERSION = 1;
const MAX_QUEUE_SIZE = 50;
const MAX_ATTEMPTS = 5;

export interface QueuedFormResponse {
  id?: number;
  applicationId: string;
  docType: string;
  data: Record<string, unknown>;
  enqueuedAt: number;
  attempts: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function reqAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function buildUrl(applicationId: string, docType: string): string {
  const base = (ENV.API_BASE || "https://server.boreal.financial").replace(/\/+$/, "");
  return `${base}/api/portal/applications/${encodeURIComponent(applicationId)}/form-responses/${encodeURIComponent(docType)}`;
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function enqueueFormResponse(params: {
  applicationId: string;
  docType: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const descriptor: QueuedFormResponse = {
    applicationId: params.applicationId,
    docType: params.docType,
    data: params.data,
    enqueuedAt: Date.now(),
    attempts: 0,
  };
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  // De-dupe: if there's already an entry for the same (applicationId, docType),
  // replace it. Form responses are PUT semantics — only the latest payload matters.
  const queue = await reqAsPromise(store.getAll() as IDBRequest<QueuedFormResponse[]>);
  for (const item of queue) {
    if (item.applicationId === params.applicationId && item.docType === params.docType) {
      if (item.id !== undefined) store.delete(item.id);
    }
  }

  if (queue.length >= MAX_QUEUE_SIZE) {
    const oldest = queue[0];
    if (oldest && oldest.id !== undefined) store.delete(oldest.id);
  }
  store.add(descriptor);
  await txDone(tx);
}

export async function queueLength(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const all = await reqAsPromise(
      tx.objectStore(STORE_NAME).getAll() as IDBRequest<QueuedFormResponse[]>
    );
    return all.length;
  } catch {
    return 0;
  }
}

export async function processQueue(): Promise<{ succeeded: number; remaining: number }> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { succeeded: 0, remaining: await queueLength() };
  }
  let succeeded = 0;
  const db = await openDB();
  const readTx = db.transaction(STORE_NAME, "readonly");
  const all = await reqAsPromise(
    readTx.objectStore(STORE_NAME).getAll() as IDBRequest<QueuedFormResponse[]>
  );

  for (const item of all) {
    try {
      const res = await fetch(buildUrl(item.applicationId, item.docType), {
        method: "PUT",
        credentials: "include",
        headers: buildAuthHeaders(),
        body: JSON.stringify({ data: item.data }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);

      const wtx = db.transaction(STORE_NAME, "readwrite");
      if (item.id !== undefined) wtx.objectStore(STORE_NAME).delete(item.id);
      await txDone(wtx);
      succeeded += 1;
    } catch {
      // Bump attempts; drop if cap reached.
      try {
        const wtx = db.transaction(STORE_NAME, "readwrite");
        const store = wtx.objectStore(STORE_NAME);
        if (item.id !== undefined) {
          const existing = await reqAsPromise(
            store.get(item.id) as IDBRequest<QueuedFormResponse | undefined>
          );
          if (existing) {
            const nextAttempts = (existing.attempts ?? 0) + 1;
            if (nextAttempts >= MAX_ATTEMPTS) {
              if (item.id !== undefined) store.delete(item.id);
            } else {
              existing.attempts = nextAttempts;
              store.put(existing);
            }
          }
        }
        await txDone(wtx);
      } catch {
        /* swallow */
      }
    }
  }
  return { succeeded, remaining: await queueLength() };
}

// Test-only seam.
export const __internal = { DB_NAME, STORE_NAME, MAX_QUEUE_SIZE, MAX_ATTEMPTS };
