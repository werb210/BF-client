// BF_CLIENT_v852_CALC_QBO - hand a generated file to the person: in the iPhone / iPad / Android app the share sheet (Save to
// Files, Mail, AirDrop ...), in a browser a normal download.
export type SaveOutcome = "shared" | "downloaded" | "cancelled";

function isNativeApp(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try { return Boolean(cap?.isNativePlatform?.()); } catch { return false; }
}

export async function saveGeneratedFile(data: Uint8Array | string, name: string, type: string): Promise<SaveOutcome> {
  const part: BlobPart = typeof data === "string" ? data : (data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  const blob = new Blob([part], { type });
  const nav = (typeof navigator !== "undefined" ? navigator : null) as (Navigator & { canShare?: (d: unknown) => boolean }) | null;
  if (isNativeApp() && nav?.share && typeof File !== "undefined") {
    const file = new File([blob], name, { type });
    if (!nav.canShare || nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: name });
        return "shared";
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return "cancelled";
        // fall through to a download
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
