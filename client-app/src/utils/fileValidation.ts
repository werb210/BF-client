// BF_CLIENT_QA_UPLOAD_v1
// Client-side gate mirrors the BF-Server documents.ts allowlist (PDF, Word,
// Excel, common images, CSV/text). The server is the authoritative gate; this
// is a fast pre-check. Falls back to the file extension when the browser
// reports an empty MIME type (common for HEIC and some CSV exports).
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/heic",
  "image/heif",
  "image/webp",
  "text/csv",
  "text/plain",
];

export const ALLOWED_EXTS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
  ".png", ".jpg", ".jpeg", ".heic", ".heif", ".webp",
];

export function validateFile(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const typeOk = ALLOWED_TYPES.includes(type);
  const extOk = ALLOWED_EXTS.some((e) => name.endsWith(e));
  if (!typeOk && !extOk) {
    throw new Error("Unsupported file type");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File exceeds 25MB limit");
  }
}
