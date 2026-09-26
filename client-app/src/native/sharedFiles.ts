// BF_CLIENT_BLOCK_v550_SHARE_TO_BOREAL - files shared from Mail/Files/Photos wait here for ShareInbox.
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
type NativeShared = { path: string; name: string; mimeType: string };
interface SharedFilesPlugin { take(): Promise<{ files: NativeShared[] }>; }
const SharedFiles = registerPlugin<SharedFilesPlugin>("SharedFiles");
export const SHARED_EVENT = "boreal:shared-files";
const pending: File[] = [];
const MIME: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel",
  csv: "text/csv", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", doc: "application/msword",
};
export function isSharedFileUrl(url: unknown): url is string {
  return typeof url === "string" && /^(file|content):\/\//i.test(url.trim());
}
export function fileNameFromUrl(url: string): string {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() ?? "");
    return last || "shared-file";
  } catch {
    return "shared-file";
  }
}
export function mimeFor(name: string, fallback?: string): string {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  return MIME[ext] ?? (fallback || "application/octet-stream");
}
function base64ToFile(b64: string, name: string, type: string): File {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type });
}
async function readAsFile(path: string, name: string, type: string): Promise<File | null> {
  try {
    const r = await Filesystem.readFile({ path });
    return typeof r.data === "string" ? base64ToFile(r.data, name, type) : new File([r.data], name, { type });
  } catch {
    return null;
  }
}
export function publishShared(files: File[]): void {
  if (!files.length) return;
  pending.push(...files);
  window.dispatchEvent(new Event(SHARED_EVENT));
}
export function takePendingShared(): File[] {
  return pending.splice(0);
}
export async function receiveSharedUrl(url: string): Promise<void> {
  const name = fileNameFromUrl(url);
  const file = await readAsFile(url, name, mimeFor(name));
  if (file) publishShared([file]);
}
export async function collectAndroidShares(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("SharedFiles")) return;
  try {
    const { files } = await SharedFiles.take();
    const out: File[] = [];
    for (const s of files ?? []) {
      const name = s.name || fileNameFromUrl(s.path);
      const f = await readAsFile(s.path, name, mimeFor(name, s.mimeType));
      if (f) out.push(f);
    }
    publishShared(out);
  } catch {
    /* nothing shared */
  }
}
