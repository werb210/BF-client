export type ApiError = {
  status?: "error";
  error?: string;
  rid?: string;
  response?: {
    data?: unknown;
    status?: number;
  };
};

export interface DocumentCounts {
  required_count: number;
  received_count: number;
}

export interface ApplicationDocumentsResponse {
  documents: unknown[];
  document_review?: unknown;
  documentReview?: unknown;
  required_count?: number;
  received_count?: number;
}

export interface PipelineResponse {
  stages: unknown[];
  steps: unknown[];
}
