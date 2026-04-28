// BF_UPLOAD_QUEUE_v51 — "upload later" + retry queue per V1 BF-client spec.
// FormData isn't JSON-serializable so we can't store it in IndexedDB; we store
// a descriptor instead and rebuild the FormData inside processQueue.
import { ClientAppAPI } from "../api/clientApp";

const DB_NAME = "bf-upload-queue";
const STORE_NAME = "uploads";
const DB_VERSION = 2;
const MAX_QUEUE_SIZE = 20;

export interface QueuedUploadDescriptor {
  id?: number;
  applicationToken: string;
  applicationId: string | null | undefined;
  documentType: string;
  filename: string;
  contentType: string;
  base64: string;        // file bytes encoded as base64 (data:...,<base64>)
  enqueuedAt: number;
  attempts: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        // Schema v1 stored FormData objects which aren't structured-cloneable
        // for our purposes. Drop and recreate so v2 starts clean.
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
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

async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("readAsDataURL_failed"));
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("file_read_error"));
    reader.readAsDataURL(file);
  });
}

function base64ToFile(b64: string, filename: string, contentType: string): File {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type: contentType || "application/octet-stream" });
}

export async function enqueueUploadFromFile(params: {
  applicationToken: string;
  applicationId: string | null | undefined;
  documentType: string;
  file: File;
}): Promise<void> {
  const base64 = await fileToBase64(params.file);
  const descriptor: QueuedUploadDescriptor = {
    applicationToken: params.applicationToken,
    applicationId: params.applicationId ?? null,
    documentType: params.documentType,
    filename: params.file.name,
    contentType: params.file.type || "application/octet-stream",
    base64,
    enqueuedAt: Date.now(),
    attempts: 0,
  };
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const queue = await reqAsPromise(store.getAll() as IDBRequest<QueuedUploadDescriptor[]>);
  if (queue.length >= MAX_QUEUE_SIZE) {
    const oldest = queue[0];
    if (oldest?.id !== undefined) store.delete(oldest.id);
  }
  store.add(descriptor);
  await txDone(tx);
}

export async function queueLength(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const all = await reqAsPromise(store.getAll() as IDBRequest<QueuedUploadDescriptor[]>);
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
  // Snapshot the queue, then process item-by-item with its own write tx so we
  // commit deletes incrementally rather than holding one long write tx.
  const readTx = db.transaction(STORE_NAME, "readonly");
  const all = await reqAsPromise(
    readTx.objectStore(STORE_NAME).getAll() as IDBRequest<QueuedUploadDescriptor[]>
  );
  for (const item of all) {
    try {
      const file = base64ToFile(item.base64, item.filename, item.contentType);
      await ClientAppAPI.uploadDocument({
        applicationToken: item.applicationToken,
        applicationId: item.applicationId ?? undefined,
        documentType: item.documentType,
        file,
      });
      const wtx = db.transaction(STORE_NAME, "readwrite");
      if (item.id !== undefined) wtx.objectStore(STORE_NAME).delete(item.id);
      await txDone(wtx);
      succeeded += 1;
    } catch {
      // Bump attempts; leave in queue.
      try {
        const wtx = db.transaction(STORE_NAME, "readwrite");
        const store = wtx.objectStore(STORE_NAME);
        if (item.id !== undefined) {
          const existing = await reqAsPromise(store.get(item.id) as IDBRequest<QueuedUploadDescriptor | undefined>);
          if (existing) {
            existing.attempts = (existing.attempts ?? 0) + 1;
            store.put(existing);
          }
        }
        await txDone(wtx);
      } catch { /* swallow */ }
    }
  }
  return { succeeded, remaining: await queueLength() };
}
