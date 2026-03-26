import type { AxiosProgressEvent } from "axios";
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
      lastError = err;
      const apiError = err as ApiError;
      const status = apiError.response?.status;
      const retriable = !status || [429, 500, 502, 503, 504].includes(status);
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
      parseApiResponse(
        ClientAppStartResponseSchema,
        res.data,
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
      const res = await api.post<GenericObjectResponse>(DOCUMENT_CONTRACT.UPLOAD, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event: AxiosProgressEvent) => {
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
  submit(token: string) {
    return withRetry(() => api.post<GenericObjectResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${token}/submit`));
  },
  status(token: string) {
    return withRetry(async () => {
      const res = await api.get<ClientAppStatusResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${token}`);
      parseApiResponse(
        ClientAppStatusResponseSchema,
        res.data,
        "GET /applications/{token}"
      );
      return res;
    });
  },
  getApplication(applicationId: string) {
    return withRetry(async () => {
      const res = await api.get<ClientAppStatusResponse>(`${API_ENDPOINTS_CONTRACT.CLIENT_APPLICATIONS.PREFIX}${applicationId}`);
      parseApiResponse(
        ClientAppStatusResponseSchema,
        res.data,
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
      parseApiResponse(
        ClientAppMessagesResponseSchema,
        res.data,
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
