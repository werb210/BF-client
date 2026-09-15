// BF_CLIENT_DOCUMENT_DUPLICATE_CHECK_v258
// The only document check the client makes: is this exact file already on the
// application? A SHA-256 fingerprint is computed from the file's bytes - no
// content is read or interpreted. BF-Server (v256) enforces the same rule on
// every upload path; this gives the applicant the answer instantly, before a
// multi-megabyte upload, and names where the file already is.

async function readBytes(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  // Older WebViews: Blob.arrayBuffer is missing but FileReader is not.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function fingerprintFile(file: Blob): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const digest = await subtle.digest("SHA-256", await readBytes(file));
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

type DocumentsState = Record<string, { files?: Array<{ hash?: string | null; name?: string }> } | null | undefined>;

/** The document type that already holds a file with this fingerprint, if any. */
export function findUploadedDuplicate(documents: DocumentsState, hash: string | null): { docType: string; name: string | null } | null {
  if (!hash) return null;
  for (const [docType, entry] of Object.entries(documents ?? {})) {
    const files = Array.isArray(entry?.files) ? entry!.files! : [];
    const hit = files.find((f) => f?.hash === hash);
    if (hit) return { docType, name: hit.name ?? null };
  }
  return null;
}

export function duplicateMessage(targetDocType: string, found: { docType: string }, label: (docType: string) => string): string {
  if (found.docType === targetDocType) return "You've already uploaded this file here.";
  return `This file is already uploaded under ${label(found.docType)}. Each document only needs to be uploaded once, in the right place.`;
}

export const SERVER_DUPLICATE_MESSAGE =
  "This exact file is already on your application. Each document only needs to be uploaded once, in the right place.";

export function isServerDuplicate(error: unknown): boolean {
  const e = error as { status?: number; message?: string; code?: string } | null;
  return e?.status === 409 && (e?.message === "DUPLICATE_DOCUMENT" || e?.code === "DUPLICATE_DOCUMENT");
}
