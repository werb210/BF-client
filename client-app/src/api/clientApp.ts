import type { AxiosProgressEvent } from "axios";
import { z } from "zod";
import api from "@/api/client";
import { buildUrl } from "@/config/api";
import {
  ClientAppMessagesResponseSchema,
  ClientAppStartResponseSchema,
  ClientAppStatusResponseSchema,
  parseApiResponse,
} from "@/contracts/clientApiSchemas";
import type { ApiError } from "@/types/api";
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
      const res = await api.post<ClientAppStartResponse>("/api/applications", payload);
      parseApiResponse(
        ClientAppStartResponseSchema,
        res.data,
        "POST /api/applications"
      );
      return res;
    });
  },
  update(token: string, payload: unknown) {
    return withRetry(() => api.patch<ClientAppStatusResponse>(`/api/applications/${token}`, payload));
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
      api.patch<ClientAppStatusResponse>(`/api/applications/${token}`, payload)
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
      formData.append("file", payload.file);
      formData.append("category", payload.documentType);
      formData.append("applicationId", String(payload.applicationId ?? ""));
      if (payload.applicationToken) formData.append("application_token", payload.applicationToken);
      const res = await api.post<GenericObjectResponse>(buildUrl("/documents/upload"), formData, {
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
      api.patch<ClientAppStatusResponse>(`/api/applications/${token}`, { documentsDeferred: true })
    );
  },
  submit(token: string) {
    return withRetry(() => api.post<GenericObjectResponse>(`/api/applications/${token}/submit`));
  },
  status(token: string) {
    return withRetry(async () => {
      const res = await api.get<ClientAppStatusResponse>(`/api/applications/${token}`);
      parseApiResponse(
        ClientAppStatusResponseSchema,
        res.data,
        "GET /api/applications/{token}"
      );
      return res;
    });
  },
  getApplication(applicationId: string) {
    return withRetry(async () => {
      const res = await api.get<ClientAppStatusResponse>(`/api/applications/${applicationId}`);
      parseApiResponse(
        ClientAppStatusResponseSchema,
        res.data,
        "GET /api/applications/{applicationId}"
      );
      return res;
    });
  },
  updateApplication(applicationId: string, payload: unknown) {
    return withRetry(() => api.patch<ClientAppStatusResponse>(`/api/applications/${applicationId}`, payload));
  },
  getMessages(token: string) {
    return withRetry(async () => {
      const res = await api.get<ClientAppMessagesResponse>(`/api/applications/${token}/messages`);
      parseApiResponse(
        ClientAppMessagesResponseSchema,
        res.data,
        "GET /api/applications/{token}/messages"
      );
      return res;
    });
  },
  sendMessage(token: string, text: string) {
    return withRetry(() =>
      api.post<GenericObjectResponse>(`/api/applications/${token}/messages`, { text })
    );
  },
  getSignNowUrl(token: string) {
    return withRetry(() => api.get<GenericObjectResponse>(`/api/applications/${token}/signnow`));
  },
};
