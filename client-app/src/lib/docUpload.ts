// BF_CLIENT_DIRECT_UPLOAD_v730
// One upload path for the client portal. The to-do list's Upload button opens the file picker
// directly (no in-between pop-up) and sends the files here; the DocPicker pop-up uses the same
// rules. A failure is reported to the server with the browser's own error so the cause is visible,
// and "No connection" is only said when the browser really is offline.
import { ENV } from "@/env";
import { getToken } from "@/auth/token";
import { enqueueUploadFromFile, isRetryableUploadFailure } from "@/lib/uploadQueue";

export type UploadOutcome =
  | { status: "ok" }
  | { status: "queued"; queued: number; message: string }
  | { status: "failed"; message: string };

const isOnline = (): boolean => typeof navigator === "undefined" || navigator.onLine !== false;

/** The notice for files saved on the device to retry. Only says "No connection" when the browser is offline. */
export function queuedMessage(queued: number, online: boolean = isOnline()): string {
  const files = queued + " file" + (queued === 1 ? " is" : "s are");
  return online
    ? "That upload didn't go through. " + files + " saved on this device and will be sent again automatically in a few seconds."
    : "No connection right now. " + files + " saved on this device and will upload automatically when you're back online.";
}

/** The message for an upload the server refused. */
export function failureMessage(status: number | undefined): string {
  return status === 401 ? "Session expired. Please sign in again."
    : status === 409 ? "That file has already been uploaded."
    : status === 413 ? "That file is too large. Please use a smaller file (under 25 MB)."
    : status === 415 ? "That file type is not supported. Please upload a PDF, Word document, Excel file, or a photo (PNG/JPEG/HEIC)."
    : "Upload failed. Please try again.";
}

/** Fire-and-forget: tell the server what the browser saw. Never throws. */
export function reportUploadFailure(info: Record<string, unknown>): void {
  try {
    void fetch(ENV.API_BASE + "/api/client/upload-failure", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + (getToken() ?? "") },
      body: JSON.stringify({ ...info, online: isOnline() }),
    }).catch((): void => undefined);
  } catch {
    // reporting must never break an upload
  }
}

/** Opens the file picker. Call from inside a click handler so browsers allow it. */
export function pickFiles(onPicked: (files: File[]) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.onchange = () => { const files = Array.from(input.files ?? []); if (files.length) onPicked(files); };
  input.click();
}

/** Uploads each file against one requirement, in order. Retryable failures are saved on the device. */
export async function uploadDocumentFiles(applicationId: string, documentType: string, files: File[], attempt = "direct"): Promise<UploadOutcome> {
  let queued = 0;
  for (const file of files) {
    if (queued > 0) {
      try { await enqueueUploadFromFile({ applicationToken: "", applicationId, documentType, file, mode: "session" }); queued += 1; continue; }
      catch { return { status: "failed", message: failureMessage(undefined) }; }
    }
    const form = new FormData();
    form.append("file", file);
    form.append("category", documentType);
    form.append("document_type", documentType);
    form.append("applicationId", applicationId);
    const t0 = Date.now();
    let resp: Response | undefined;
    try {
      resp = await fetch(ENV.API_BASE + "/api/client/documents/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + (getToken() ?? "") },
        body: form,
      });
      if (!resp.ok) throw new Error(String(resp.status));
    } catch (err) {
      const status = resp && !resp.ok ? resp.status : undefined;
      reportUploadFailure({
        applicationId, documentType, attempt, status: status ?? null,
        errorName: err instanceof Error ? err.name : typeof err, errorMessage: err instanceof Error ? err.message : String(err),
        sizeBytes: file.size, contentType: file.type || null, ms: Date.now() - t0,
      });
      if (isRetryableUploadFailure(status, status === undefined ? err : undefined)) {
        try { await enqueueUploadFromFile({ applicationToken: "", applicationId, documentType, file, mode: "session" }); queued += 1; continue; }
        catch { /* fall through */ }
      }
      console.error("[upload] failed:", err instanceof Error ? err.message : String(err), status);
      return { status: "failed", message: failureMessage(status) };
    }
  }
  return queued > 0 ? { status: "queued", queued, message: queuedMessage(queued) } : { status: "ok" };
}
