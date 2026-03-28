import api from "@/api/client";
import type { ProcessingStatus } from "@/types/processing";
import type { DocumentCounts } from "@/types/api";
import {
  ProcessingStatusResponseSchema,
  parseApiResponse,
} from "@/contracts/clientApiSchemas";

type RawProcessingCheckpoint = {
  status?: string | null;
  completedAt?: string | null;
  completed_at?: string | null;
  receivedCount?: number | null;
  requiredCount?: number | null;
  statementCount?: number | null;
  requiredStatements?: number | null;
} & Partial<DocumentCounts>;

type ProcessingStatusPayload = {
    documentReview?: RawProcessingCheckpoint;
    document_review?: RawProcessingCheckpoint;
    documents?: RawProcessingCheckpoint;
    document_processing?: RawProcessingCheckpoint;
    document?: RawProcessingCheckpoint;
    financialReview?: RawProcessingCheckpoint;
    financial_review?: RawProcessingCheckpoint;
    financials?: RawProcessingCheckpoint;
    financial_processing?: RawProcessingCheckpoint;
    financial?: RawProcessingCheckpoint;
    steps?: RawProcessingCheckpoint[];
    stages?: RawProcessingCheckpoint[];
  } & {
  };

function normalizeStatus(value: unknown): ProcessingStatus["documentReview"]["status"] {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "completed" || normalized === "complete") return "completed";
  if (normalized === "processing" || normalized === "in_progress") return "processing";
  if (normalized === "failed" || normalized === "error") return "failed";
  return "pending";
}

function normalizeCheckpoint(raw?: RawProcessingCheckpoint | null): ProcessingStatus["documentReview"] {
  return {
    status: normalizeStatus(raw?.status),
    completedAt: raw?.completedAt || raw?.completed_at || null,
    details: {
      receivedCount: raw?.receivedCount ?? raw?.statementCount ?? raw?.received_count ?? null,
      requiredCount: raw?.requiredCount ?? raw?.requiredStatements ?? raw?.required_count ?? null,
    },
  };
}

function isCheckpointLike(value: unknown): value is RawProcessingCheckpoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as RawProcessingCheckpoint;
  return typeof candidate.status === "string";
}

function extractCheckpointCandidates(source: ProcessingStatusPayload): RawProcessingCheckpoint[] {
  if (Array.isArray(source.steps)) {
    return source.steps.filter(isCheckpointLike);
  }
  if (Array.isArray(source.stages)) {
    return source.stages.filter(isCheckpointLike);
  }
  return Object.values(source).filter(isCheckpointLike);
}

export async function fetchProcessingStatus(
  applicationId: string
): Promise<ProcessingStatus> {
  const apiResponse = await api.get(
    `/applications/${applicationId}/processing/status`
  );
  const { data: payload } = apiResponse;
  const raw = parseApiResponse(
    ProcessingStatusResponseSchema,
    payload,
    "GET /applications/{id}/processing/status"
  ) as unknown as ProcessingStatusPayload;

  const documentSource =
    raw.documentReview ||
    raw.document_review ||
    raw.documents ||
    raw.document_processing ||
    raw.document;
  const financialSource =
    raw.financialReview ||
    raw.financial_review ||
    raw.financials ||
    raw.financial_processing ||
    raw.financial;

  let documentCheckpoint = documentSource;
  let financialCheckpoint = financialSource;

  if (!documentCheckpoint || !financialCheckpoint) {
    const candidates = extractCheckpointCandidates(raw);
    if (!documentCheckpoint && candidates[0]) {
      documentCheckpoint = candidates[0];
    }
    if (!financialCheckpoint && candidates[1]) {
      financialCheckpoint = candidates[1];
    }
  }

  return {
    documentReview: normalizeCheckpoint(documentCheckpoint),
    financialReview: normalizeCheckpoint(financialCheckpoint),
  };
}
