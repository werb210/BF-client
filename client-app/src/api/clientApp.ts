import { z } from "zod";
import api from "@/api/client";

import {
  ClientAppMessagesResponseSchema,
  ClientAppStartResponseSchema,
  ClientAppStatusResponseSchema,
  parseApiResponse,
} from "@/contracts/clientApiSchemas";
import type { ApiError } from "@/types/api";
import { API_ENDPOINTS_CONTRACT, DOCUMENT_CONTRACT } from "@/contracts";
import { validateFile } from "@/utils/fileValidation";
import type { ApplicationData as ApplicationDraft } from "@/types/application";

type ClientAppStartResponse = z.infer<typeof ClientAppStartResponseSchema>;
type ClientAppStatusResponse = z.infer<typeof ClientAppStatusResponseSchema>;
type ClientAppMessagesResponse = z.infer<typeof ClientAppMessagesResponseSchema>;
type GenericObjectResponse = Record<string, any>;

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
        // [retry] 4xx short-circuit — permanent errors must not be retried
        const status = (err as any)?.status ?? (err as any)?.response?.status;
        if (typeof status === "number" && status >= 400 && status < 500) {
          throw err;
        }
      lastError = err;
      const apiError = err as ApiError;
      const responseStatus = apiError.response?.status;
      const retriable = !responseStatus || [429, 500, 502, 503, 504].includes(responseStatus);
      if (!retriable || i === attempts - 1) {
        throw err;
      }
      await new Promise((res) => setTimeout(res, 500 * (i + 1)));
    }
  }
  throw lastError;
}

export const ClientAppAPI = {
  start(payload: unknown) {
    return withRetry(async () => {
      const res = await api.post<ClientAppStartResponse>(API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.ROOT, payload);
      const { data: resPayload } = res;
      parseApiResponse(
        ClientAppStartResponseSchema,
        resPayload,
        "POST /applications"
      );
      return res;
    });
  },
  update(token: string, payload: unknown) {
    return withRetry(() => api.patch<ClientAppStatusResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${token}`, payload));
  },
  uploadDoc(
    token: string,
    payload: {
      documents: Record<
        string,
        { name: string; base64: string; productId?: string; documentCategory?: string }
      >;
    }
  ) {
    return withRetry(() =>
      api.patch<ClientAppStatusResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${token}`, payload)
    );
  },

  uploadDocument(
    payload: {
      applicationId?: string;
      applicationToken?: string;
      documentType: string;
      file: File;
      onProgress?: (progress: number) => void;
    }
  ) {
    return withRetry(async () => {
      validateFile(payload.file);

      const formData = new FormData();
      formData.append(DOCUMENT_CONTRACT.FIELDS.FILE, payload.file);
      formData.append(DOCUMENT_CONTRACT.FIELDS.CATEGORY, payload.documentType);
      formData.append(DOCUMENT_CONTRACT.FIELDS.APPLICATION_ID, String(payload.applicationId ?? ""));
      if (payload.applicationToken) formData.append("application_token", payload.applicationToken);
      // BF_CLIENT_UPLOAD_BOUNDARY_v62 — do NOT manually set Content-Type
      // for FormData. Setting "multipart/form-data" without ";boundary=..."
      // causes multer to throw "Multipart: Boundary not found" → 500 on every
      // upload (and every retry from the upload queue). The fetch wrapper in
      // src/api/client.ts already short-circuits Content-Type for FormData
      // bodies; native fetch then auto-emits "multipart/form-data; boundary=..."
      // with the correct boundary derived from the FormData instance.
      const res = await api.post<GenericObjectResponse>(DOCUMENT_CONTRACT.UPLOAD, formData, {
        onUploadProgress: (event: { loaded: number; total?: number }) => {
          if (!event.total) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          payload.onProgress?.(percent);
        },
      });
      return res;
    });
  },
  deferDocuments(token: string) {
    return withRetry(() =>
      api.patch<ClientAppStatusResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${token}`, { documentsDeferred: true })
    );
  },
  submit(token: string, payload: { app: ApplicationDraft; normalized: unknown }) {
    return withRetry(() =>
      api.post<GenericObjectResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${token}/submit`, payload)
    );
  },
  status(token: string) {
    return withRetry(async () => {
      const res = await api.get<ClientAppStatusResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${token}`);
      const { data: resPayload } = res;
      parseApiResponse(
        ClientAppStatusResponseSchema,
        resPayload,
        "GET /applications/{token}"
      );
      return res;
    });
  },
  getApplication(applicationId: string) {
    return withRetry(async () => {
      const res = await api.get<ClientAppStatusResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${applicationId}`);
      const { data: resPayload } = res;
      parseApiResponse(
        ClientAppStatusResponseSchema,
        resPayload,
        "GET /applications/{applicationId}"
      );
      return res;
    });
  },
  updateApplication(applicationId: string, payload: unknown) {
    return withRetry(() => api.patch<ClientAppStatusResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${applicationId}`, payload));
  },
  getMessages(token: string) {
    return withRetry(async () => {
      const res = await api.get<ClientAppMessagesResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${token}/messages`);
      const { data: resPayload } = res;
      parseApiResponse(
        ClientAppMessagesResponseSchema,
        resPayload,
        "GET /applications/{token}/messages"
      );
      return res;
    });
  },
  sendMessage(token: string, text: string) {
    return withRetry(() =>
      api.post<GenericObjectResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${token}/messages`, { text })
    );
  },
  getSignNowUrl(token: string) {
    return withRetry(() => api.get<GenericObjectResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${token}/signnow`));
  },
};
