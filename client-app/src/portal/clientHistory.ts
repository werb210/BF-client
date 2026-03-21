// @ts-nocheck
import { formatDocumentLabel } from "@/wizard/requirements";

export type ClientHistoryEvent = {
  id: string;
  type: "stage" | "document" | "offer";
  title: string;
  detail?: string | null;
  occurredAt: string;
};

type HistoryInput = {
  status?: unknown;
  submissionStatus?: { updatedAt?: string | null } | null;
  stageLabel?: string | null;
};

function formatTimestamp(value: string | null | undefined) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

function createId(prefix: string, index: number) {
  return `${prefix}-${index}`;
}

function normalizeStageLabel(value: unknown) {
  if (!value) return "";
  return String(value)
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDocumentList(status?: unknown) {
  const documents =
    status?.documents ||
    status?.application?.documents ||
    status?.document_categories ||
    [];
  return Array.isArray(documents) ? documents : Object.values(documents);
}

function getOfferList(status?: unknown) {
  if (Array.isArray(status?.offers)) return status.offers;
  if (Array.isArray(status?.application?.offers)) return status.application.offers;
  if (status?.offer) return [status.offer];
  return [];
}

export function buildClientHistoryEvents({
  status,
  submissionStatus,
  stageLabel,
}: HistoryInput): ClientHistoryEvent[] {
  const events: ClientHistoryEvent[] = [];

  const history = status?.history || status?.timeline || status?.stage_history;
  if (Array.isArray(history)) {
    history.forEach((entry: unknown, index: number) => {
      const label =
        entry?.stage ||
        entry?.stageLabel ||
        entry?.label ||
        entry?.name ||
        "";
      const normalizedLabel = normalizeStageLabel(label);
      if (!normalizedLabel) return;
      events.push({
        id: createId("stage", index),
        type: "stage",
        title: normalizedLabel,
        occurredAt: formatTimestamp(
          entry?.updated_at || entry?.updatedAt || entry?.timestamp || null
        ),
      });
    });
  }

  if (!events.some((event) => event.type === "stage") && stageLabel) {
    events.push({
      id: createId("stage", 0),
      type: "stage",
      title: stageLabel,
      occurredAt: formatTimestamp(
        submissionStatus?.updatedAt ||
          status?.updated_at ||
          status?.updatedAt ||
          null
      ),
    });
  }

  const documents = getDocumentList(status);
  documents.forEach((doc: unknown, index: number) => {
    const rawStatus =
      doc?.status ||
      doc?.state ||
      doc?.document_status ||
      doc?.upload_status ||
      (doc?.rejected ? "rejected" : "");
    if (String(rawStatus).toLowerCase() !== "rejected") return;
    const category =
      doc?.category ||
      doc?.category ||
      doc?.documentType ||
      doc?.document_type ||
      doc?.name ||
      "Document";
    const reason =
      doc?.rejection_reason || doc?.rejectionReason || doc?.reason || null;
    events.push({
      id: createId("document", index),
      type: "document",
      title: `Document rejected: ${formatDocumentLabel(String(category))}`,
      detail: reason ? String(reason) : null,
      occurredAt: formatTimestamp(
        doc?.rejected_at || doc?.rejectedAt || doc?.updated_at || null
      ),
    });
  });

  const offers = getOfferList(status);
  offers.forEach((offer: unknown, index: number) => {
    const availableAt =
      offer?.available_at ||
      offer?.created_at ||
      offer?.createdAt ||
      offer?.updated_at ||
      null;
    if (availableAt) {
      events.push({
        id: createId("offer", index),
        type: "offer",
        title: "Offer available",
        occurredAt: formatTimestamp(availableAt),
      });
    }
    const expiresAt = offer?.expires_at || offer?.expiresAt || null;
    if (expiresAt) {
      events.push({
        id: createId("offer", index + 50),
        type: "offer",
        title: "Offer expires",
        occurredAt: formatTimestamp(expiresAt),
      });
    }
  });

  const ordered = [...events].sort((a, b) => {
    const timeA = new Date(a.occurredAt).getTime();
    const timeB = new Date(b.occurredAt).getTime();
    return timeA - timeB;
  });

  return [...ordered];
}
