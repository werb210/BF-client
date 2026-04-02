export type ApiSuccess<T> = {
  status: "ok";
  data: T;
};

export type ApiError = {
  status?: "error";
  error?: string;
  response?: {
    data?: unknown;
    status?: number;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

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

