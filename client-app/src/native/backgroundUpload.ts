// BF_CLIENT_BACKGROUND_UPLOAD_v307
// Native background services finish queued uploads after the app closes. Their
// results are reconciled with the IndexedDB queue the next time the app opens.
import { Capacitor, registerPlugin } from "@capacitor/core";
import { ENV } from "@/env";
import { getToken } from "@/auth/token";
import { DOCUMENT_CONTRACT } from "@/contracts/document.contract";
import { listQueuedUploads, removeQueuedUpload, updateQueuedUpload, type QueuedUploadDescriptor } from "@/lib/uploadQueue";

type BackgroundResult = { id: string; status: number; error?: string };
interface BackgroundUploadPlugin {
  enqueue(options: { id: string; url: string; fileBase64: string; fileName: string; mimeType: string; fields: Record<string, string>; headers: Record<string, string> }): Promise<void>;
  results(): Promise<{ results: BackgroundResult[] }>;
  acknowledge(options: { ids: string[] }): Promise<void>;
  cancelAll(): Promise<void>;
}
const BackgroundUpload = registerPlugin<BackgroundUploadPlugin>("BackgroundUpload");

export function backgroundUploadsAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("BackgroundUpload");
}

export const backgroundIdFor = (queueId: number) => `bf-upload-${queueId}`;

export function requestFor(item: QueuedUploadDescriptor, token: string | null, apiBase: string) {
  const headers: Record<string, string> = { "X-Background-Upload": "1" };
  if (item.mode === "session") {
    if (token) headers.Authorization = `Bearer ${token}`;
    return {
      url: `${apiBase}/api/client/documents/upload`,
      fields: { category: item.documentType, document_type: item.documentType, applicationId: String(item.applicationId ?? "") },
      headers,
    };
  }
  const fields: Record<string, string> = {
    [DOCUMENT_CONTRACT.FIELDS.CATEGORY]: item.documentType,
    [DOCUMENT_CONTRACT.FIELDS.APPLICATION_ID]: String(item.applicationId ?? ""),
  };
  if (item.applicationToken) fields.application_token = item.applicationToken;
  return { url: `${apiBase}${DOCUMENT_CONTRACT.UPLOAD}`, fields, headers };
}

/** done: received (including duplicate); drop: permanently refused; retry: return to the web queue. */
export function outcomeFor(status: number, mode: QueuedUploadDescriptor["mode"]): "done" | "drop" | "retry" {
  if ((status >= 200 && status < 300) || status === 409) return "done";
  if (status === 401 && mode === "session") return "retry";
  if (status >= 400 && status < 500 && status !== 408 && status !== 429) return "drop";
  return "retry";
}

export async function handOffQueuedUploads(): Promise<number> {
  if (!backgroundUploadsAvailable()) return 0;
  let handed = 0;
  for (const item of await listQueuedUploads()) {
    if (item.id === undefined || item.backgroundHandedAt) continue;
    const { url, fields, headers } = requestFor(item, getToken(), ENV.API_BASE);
    try {
      await BackgroundUpload.enqueue({ id: backgroundIdFor(item.id), url, fileBase64: item.base64, fileName: item.filename, mimeType: item.contentType, fields, headers });
      await updateQueuedUpload({ ...item, backgroundHandedAt: Date.now() });
      handed += 1;
    } catch {
      // Leave the item for the in-app retry.
    }
  }
  return handed;
}

export async function reconcileBackgroundUploads(): Promise<{ done: number; dropped: number; retry: number }> {
  const summary = { done: 0, dropped: 0, retry: 0 };
  if (!backgroundUploadsAvailable()) return summary;
  let results: BackgroundResult[] = [];
  try { results = (await BackgroundUpload.results()).results ?? []; } catch { return summary; }
  if (!results.length) return summary;
  const queued = await listQueuedUploads();
  const acknowledged: string[] = [];
  for (const result of results) {
    const item = queued.find((queuedItem) => queuedItem.id !== undefined && backgroundIdFor(queuedItem.id) === result.id);
    acknowledged.push(result.id);
    if (!item || item.id === undefined) continue;
    const outcome = outcomeFor(Number(result.status) || 0, item.mode);
    if (outcome === "retry") {
      await updateQueuedUpload({ ...item, backgroundHandedAt: undefined });
      summary.retry += 1;
    } else {
      await removeQueuedUpload(item.id);
      if (outcome === "done") summary.done += 1;
      else summary.dropped += 1;
    }
  }
  await BackgroundUpload.acknowledge({ ids: acknowledged }).catch((): void => undefined);
  return summary;
}

export async function cancelBackgroundUploads(): Promise<void> {
  if (!backgroundUploadsAvailable()) return;
  await BackgroundUpload.cancelAll().catch((): void => undefined);
}
