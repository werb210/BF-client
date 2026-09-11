// v132-document-scanner
// Wraps the native document scanner and normalizes its result into the
// UploadItem shape the v129 queue consumes. All branching is pure so the
// mapping is testable without a device.

export type ScanResult = {
  /** One entry per page, or a single entry when the plugin returns a PDF. */
  refs: string[];
  format: 'pdf' | 'image';
  cancelled: boolean;
};

export type ScanOptions = {
  maxPages?: number;
  /** Prefer a single flattened PDF over per-page images when supported. */
  preferPdf?: boolean;
};

export function isCancelled(err: unknown): boolean {
  const msg = String((err as { message?: unknown } | null)?.message ?? err ?? '').toLowerCase();
  return (
    msg.indexOf('cancel') >= 0 ||
    msg.indexOf('dismiss') >= 0 ||
    msg.indexOf('user closed') >= 0
  );
}

/** The plugin has shipped several result shapes; accept all of them. */
export function normalizeScanResult(raw: unknown): ScanResult {
  const r = (raw || {}) as Record<string, unknown>;

  const pdfPath = typeof r.pdfPath === 'string' ? r.pdfPath : '';
  if (pdfPath) return { refs: [pdfPath], format: 'pdf', cancelled: false };

  const pdf = (r.pdf || {}) as Record<string, unknown>;
  if (typeof pdf.uri === 'string' && pdf.uri) {
    return { refs: [pdf.uri], format: 'pdf', cancelled: false };
  }

  const candidates = [r.scannedImages, r.images, r.pages, r.results];
  for (const c of candidates) {
    if (!Array.isArray(c)) continue;
    const refs = c
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        const e = (entry || {}) as Record<string, unknown>;
        const uri = e.uri || e.path || e.webPath;
        return typeof uri === 'string' ? uri : '';
      })
      .filter((s) => s.length > 0);
    if (refs.length > 0) return { refs, format: 'image', cancelled: false };
  }

  return { refs: [], format: 'image', cancelled: true };
}

export function scanFileName(documentType: string, index: number, format: 'pdf' | 'image'): string {
  const safe = String(documentType || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'document';
  const ext = format === 'pdf' ? 'pdf' : 'jpg';
  const suffix = format === 'pdf' ? '' : '-p' + String(index + 1);
  return safe + suffix + '.' + ext;
}

export type QueuedScan = {
  id: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  fileRef: string;
  bytes: number;
};

export function toQueueItems(
  result: ScanResult,
  applicationId: string,
  documentType: string,
  idFactory: () => string,
): QueuedScan[] {
  if (result.cancelled || result.refs.length === 0) return [];
  return result.refs.map((ref, i) => ({
    id: idFactory(),
    applicationId,
    documentType,
    fileName: scanFileName(documentType, i, result.format),
    fileRef: ref,
    bytes: 0,
  }));
}

export async function scanDocument(options: ScanOptions = {}): Promise<ScanResult> {
  try {
    const mod = await import('@capacitor-mlkit/document-scanner');
    const scanner = (mod as unknown as Record<string, unknown>).DocumentScanner as {
      scanDocument: (opts: Record<string, unknown>) => Promise<unknown>;
    };
    if (!scanner || typeof scanner.scanDocument !== 'function') {
      return { refs: [], format: 'image', cancelled: true };
    }
    const raw = await scanner.scanDocument({
      pageLimit: options.maxPages ?? 10,
      galleryImportAllowed: true,
      resultFormats: options.preferPdf === false ? 'JPEG' : 'JPEG_PDF',
      scannerMode: 'FULL',
    });
    return normalizeScanResult(raw);
  } catch (err) {
    if (isCancelled(err)) return { refs: [], format: 'image', cancelled: true };
    throw err;
  }
}

export function isScannerAvailable(): boolean {
  try {
    const cap = (globalThis as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return Boolean(cap && cap.isNativePlatform && cap.isNativePlatform());
  } catch (err) {
    return false;
  }
}
import { Capacitor } from "@capacitor/core";
import { DocumentScanner } from "@capacitor-mlkit/document-scanner";

const encoder = new TextEncoder();

function appendBytes(parts: Uint8Array[], value: string | Uint8Array) {
  parts.push(typeof value === "string" ? encoder.encode(value) : value);
}

function joinBytes(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

async function readNativeAsset(value: string) {
  if (value.startsWith("data:")) {
    return fetch(value).then((response) => response.blob());
  }
  return fetch(Capacitor.convertFileSrc(value)).then((response) => {
    if (!response.ok) throw new Error("Unable to read scanned page");
    return response.blob();
  });
}

async function asJpeg(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare scanned page");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Unable to encode scanned page")),
      "image/jpeg",
      0.9
    )
  );
  return { bytes: new Uint8Array(await jpeg.arrayBuffer()), width: canvas.width, height: canvas.height };
}

async function imagesToPdf(images: string[]) {
  const pages = await Promise.all(images.map(async (image) => asJpeg(await readNativeAsset(image))));
  if (pages.length === 0) throw new Error("The scan did not contain any pages");

  // A compact PDF writer keeps scanning self-contained and avoids uploading each
  // VisionKit page separately. Each page is embedded as a JPEG at its native ratio.
  const objectCount = 2 + pages.length * 3;
  const objects: Array<Uint8Array | undefined> = new Array(objectCount + 1);
  const pageIds = pages.map((_, index) => 3 + index * 3);
  objects[1] = encoder.encode("<< /Type /Catalog /Pages 2 0 R >>");
  objects[2] = encoder.encode(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`);

  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const width = 612;
    const height = Math.round(width * page.height / page.width);
    objects[pageId] = encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects[imageId] = joinBytes([
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`),
      page.bytes,
      encoder.encode("\nendstream"),
    ]);
    const drawing = `q ${width} 0 0 ${height} 0 0 cm /Im${index} Do Q`;
    objects[contentId] = encoder.encode(`<< /Length ${encoder.encode(drawing).length} >>\nstream\n${drawing}\nendstream`);
  });

  const output: Uint8Array[] = [encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = new Array(objectCount + 1).fill(0);
  let offset = output[0].length;
  for (let id = 1; id <= objectCount; id += 1) {
    const object = joinBytes([encoder.encode(`${id} 0 obj\n`), objects[id]!, encoder.encode("\nendobj\n")]);
    offsets[id] = offset;
    output.push(object);
    offset += object.length;
  }
  const xrefOffset = offset;
  appendBytes(output, `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= objectCount; id += 1) appendBytes(output, `${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  appendBytes(output, `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob(output as BlobPart[], { type: "application/pdf" });
}

export async function scanDocumentAsPdf(docType: string): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const result = await DocumentScanner.scanDocument({ pageLimit: 10 });
  const pdf = await imagesToPdf(result.scannedImages ?? []);
  const safeName = docType.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "document";
  return new File([pdf], `${safeName}-scan.pdf`, { type: "application/pdf" });
}
