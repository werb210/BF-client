// BF_CLIENT_v868_DUPLICATE_UX
// BF-Server answers 409 { error: "DUPLICATE_DOCUMENT", existing: { id, category, status } } when the exact same file
// (same bytes) is already on the application. That is not a failed upload: the file is there. The client says so in
// plain words, counts the item as done when the file already sits under it, and does not report it as an upload
// failure.

export type ExistingDocument = { id?: string | null; category?: string | null; filename?: string | null; status?: string | null };

export type DuplicateUpload = {
  /** The file already sits under this same item (or this is an "Other" upload), so the item needs nothing more. */
  sameItem: boolean;
  existing: ExistingDocument;
  message: string;
};

const norm = (s: unknown): string => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

function readable(category: string): string {
  const words = category.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

/** The duplicate answer in a 409 body, or null when the body is something else. */
export function duplicateFromBody(body: unknown, documentType: string): DuplicateUpload | null {
  const b = body as { error?: unknown; code?: unknown; existing?: ExistingDocument } | null;
  if (!b || typeof b !== "object" || (b.error !== "DUPLICATE_DOCUMENT" && b.code !== "DUPLICATE_DOCUMENT")) return null;
  const existing: ExistingDocument = b.existing && typeof b.existing === "object" ? b.existing : {};
  const rejected = String(existing.status ?? "").toLowerCase() === "rejected";
  const sameItem = !rejected && (norm(documentType) === "other" || !existing.category || norm(existing.category) === norm(documentType));
  const where = existing.category ? readable(String(existing.category)) : "";
  const message = rejected
    ? "This exact file was already reviewed and could not be accepted. Please upload a new or corrected copy."
    : sameItem
      ? "This file is already uploaded. Nothing more is needed for it."
      : `This file is already uploaded${where ? ` (under ${where})` : ""}. If this item needs a different document, please choose that file.`;
  return { sameItem, existing, message };
}

/** Reads a fetch Response: the duplicate answer when it is one, otherwise null. Never throws. */
export async function readDuplicate(resp: Response | undefined, documentType: string): Promise<DuplicateUpload | null> {
  if (!resp || resp.status !== 409) return null;
  try {
    const source = typeof resp.clone === "function" ? resp.clone() : resp;
    return duplicateFromBody(await source.json(), documentType);
  } catch {
    return null;
  }
}

/** One line for a batch that had duplicates in it. */
export function duplicateSummary(duplicates: DuplicateUpload[], uploaded: number): string {
  if (uploaded > 0) {
    const n = duplicates.length;
    return `${uploaded} file${uploaded === 1 ? " was" : "s were"} uploaded. ${n} ${n === 1 ? "was" : "were"} already on your application, so ${n === 1 ? "it was" : "they were"} skipped.`;
  }
  if (duplicates.length === 1) return duplicates[0].message;
  return duplicates.every((d) => d.sameItem)
    ? "These files are already uploaded. Nothing more is needed for them."
    : duplicates.find((d) => !d.sameItem)!.message;
}
