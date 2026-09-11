// BF_CLIENT_DOC_QUALITY_v138
// Checks scanned pages for blur, darkness, low resolution, and insufficient
// frame coverage. Scoring is pure; browser rasterisation is isolated below.

export type QualityIssue = 'blurry' | 'dark' | 'low_resolution' | 'small_in_frame';

export type QualityReport = {
  ok: boolean;
  issues: QualityIssue[];
  /** Contrast-normalised variance of the Laplacian. Higher is sharper. */
  sharpness: number;
  /** Mean luminance, 0-255. */
  brightness: number;
  width: number;
  height: number;
  /** Fraction of the frame occupied by non-background pixels, 0-1. */
  coverage: number;
  message: string;
};

export const SHARPNESS_FLOOR = 0.5;
export const BRIGHTNESS_FLOOR = 70;
export const MIN_EDGE_PX = 700;
export const COVERAGE_FLOOR = 0.35;

export type Gray = {
  data: Uint8ClampedArray | Uint8Array | number[];
  width: number;
  height: number;
};

export function toGrayscale(rgba: Uint8ClampedArray | Uint8Array | number[], width: number, height: number): Gray {
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const r = Number(rgba[i * 4] ?? 0);
    const g = Number(rgba[i * 4 + 1] ?? 0);
    const b = Number(rgba[i * 4 + 2] ?? 0);
    out[i] = (r * 299 + g * 587 + b * 114) / 1000;
  }
  return { data: out, width, height };
}

export function meanBrightness(img: Gray): number {
  const n = img.width * img.height;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += Number(img.data[i] ?? 0);
  return sum / n;
}

function pixelVariance(img: Gray): number {
  const n = img.width * img.height;
  if (n === 0) return 0;
  const mean = meanBrightness(img);
  let variance = 0;
  for (let i = 0; i < n; i += 1) {
    const delta = Number(img.data[i] ?? 0) - mean;
    variance += delta * delta;
  }
  return variance / n;
}

/** Contrast-normalised variance of the Laplacian. */
export function sharpnessScore(img: Gray): number {
  const { width: w, height: h } = img;
  if (w < 3 || h < 3) return 0;
  const at = (x: number, y: number): number => Number(img.data[y * w + x] ?? 0);
  const responses: number[] = [];
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      responses.push(at(x, y - 1) + at(x, y + 1) + at(x - 1, y) + at(x + 1, y) - 4 * at(x, y));
    }
  }
  let mean = 0;
  for (const response of responses) mean += response;
  mean /= responses.length;
  let variance = 0;
  for (const response of responses) variance += (response - mean) ** 2;
  const contrast = pixelVariance(img);
  return contrast < 1 ? 0 : variance / responses.length / contrast;
}

/** Fraction of pixels matching the page rather than a dark background. */
export function coverageScore(img: Gray): number {
  const n = img.width * img.height;
  if (n === 0) return 0;
  const threshold = Math.max(30, meanBrightness(img) * 0.45);
  let page = 0;
  for (let i = 0; i < n; i += 1) if (Number(img.data[i] ?? 0) >= threshold) page += 1;
  return page / n;
}

function describe(issues: QualityIssue[]): string {
  if (issues.length === 0) return 'This page looks clear.';
  const parts: string[] = [];
  if (issues.includes('blurry')) parts.push('it looks blurry');
  if (issues.includes('dark')) parts.push('it is quite dark');
  if (issues.includes('low_resolution')) parts.push('it is a small image');
  if (issues.includes('small_in_frame')) parts.push('the page does not fill the frame');
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
  return `We can still send this, but ${joined}. Rescanning usually avoids a request to resend it.`;
}

export function assessGray(img: Gray): QualityReport {
  const sharpness = sharpnessScore(img);
  const brightness = meanBrightness(img);
  const coverage = coverageScore(img);
  const issues: QualityIssue[] = [];
  if (sharpness < SHARPNESS_FLOOR) issues.push('blurry');
  if (brightness < BRIGHTNESS_FLOOR) issues.push('dark');
  if (Math.min(img.width, img.height) < MIN_EDGE_PX) issues.push('low_resolution');
  if (coverage < COVERAGE_FLOOR) issues.push('small_in_frame');
  return { ok: issues.length === 0, issues, sharpness, brightness, width: img.width, height: img.height, coverage, message: describe(issues) };
}

export function assessRgba(rgba: Uint8ClampedArray | Uint8Array | number[], width: number, height: number): QualityReport {
  return assessGray(toGrayscale(rgba, width, height));
}

/** Worst page wins: one unreadable page is enough to warrant a rescan. */
export function worstOf(reports: QualityReport[]): QualityReport | null {
  if (reports.length === 0) return null;
  return reports.reduce((worst, report) => report.issues.length > worst.issues.length ? report : worst);
}

/** Browser-only image rasterisation; failures remain advisory. */
export async function measureImage(src: string, maxEdge = 900): Promise<QualityReport | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image load failed'));
      el.src = src.startsWith('data:') || src.startsWith('blob:') ? src : `data:image/jpeg;base64,${src}`;
    });
    const trueW = img.naturalWidth || img.width;
    const trueH = img.naturalHeight || img.height;
    if (!trueW || !trueH) return null;
    const scale = Math.min(1, maxEdge / Math.max(trueW, trueH));
    const w = Math.max(3, Math.round(trueW * scale));
    const h = Math.max(3, Math.round(trueH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    // Report the real dimensions, not the downsampled ones.
    return withTrueDimensions(assessRgba(ctx.getImageData(0, 0, w, h).data, w, h), trueW, trueH);
  } catch {
    return null;
  }
}

/** Browser-only scoring for an already-decoded scanned page Blob. */
export async function measureBlob(blob: Blob, maxEdge = 900): Promise<QualityReport | null> {
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') return null;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(blob);
    const trueW = bitmap.width;
    const trueH = bitmap.height;
    if (!trueW || !trueH) return null;
    const scale = Math.min(1, maxEdge / Math.max(trueW, trueH));
    const w = Math.max(3, Math.round(trueW * scale));
    const h = Math.max(3, Math.round(trueH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    return withTrueDimensions(assessRgba(ctx.getImageData(0, 0, w, h).data, w, h), trueW, trueH);
  } catch {
    // Quality checking is advisory. If it cannot run, the upload proceeds.
    return null;
  } finally {
    if (bitmap && typeof bitmap.close === 'function') bitmap.close();
  }
}

/** Re-state downsampled scoring against the page's real pixel dimensions. */
export function withTrueDimensions(report: QualityReport, trueW: number, trueH: number): QualityReport {
  const issues: QualityIssue[] = report.issues.filter((issue) => issue !== 'low_resolution');
  if (Math.min(trueW, trueH) < MIN_EDGE_PX) issues.push('low_resolution');
  return { ...report, width: trueW, height: trueH, issues, ok: issues.length === 0, message: describe(issues) };
}
