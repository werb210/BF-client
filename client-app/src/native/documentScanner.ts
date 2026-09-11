import { Capacitor } from "@capacitor/core";
import { DocumentScanner } from "@capacitor-mlkit/document-scanner";
// BF_CLIENT_DOC_QUALITY_v143
import { measureBlob, worstOf, type QualityReport } from "./documentQuality";

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

// BF_CLIENT_DOC_QUALITY_v143
export type ScanWithQuality = {
  file: File | null;
  /** Worst page, or null when quality could not be measured. Advisory only. */
  quality: QualityReport | null;
};

/** Scan a PDF and score every page without ever rejecting it for quality. */
export async function scanDocumentAsPdfWithQuality(docType: string): Promise<ScanWithQuality> {
  if (!Capacitor.isNativePlatform()) return { file: null, quality: null };
  const result = await DocumentScanner.scanDocument({ pageLimit: 10 });
  const images = result.scannedImages ?? [];
  let quality: QualityReport | null = null;
  try {
    const blobs = await Promise.all(images.map((image) => readNativeAsset(image)));
    const reports = (await Promise.all(blobs.map((blob) => measureBlob(blob)))).filter(
      (report): report is QualityReport => report !== null,
    );
    quality = worstOf(reports);
  } catch {
    quality = null;
  }
  const pdf = await imagesToPdf(images);
  const safeName = docType.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "document";
  return { file: new File([pdf], `${safeName}-scan.pdf`, { type: "application/pdf" }), quality };
}
