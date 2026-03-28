import type { AxiosError, AxiosInstance } from "axios";
import api from "../lib/api";

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function createHttpClient(): AxiosInstance {
  api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        const status = error.response.status;
        const message = `Request failed with status ${status}`;
        throw new ApiError(message, status, error.response?.["data"]);
      }

      throw error;
    }
  );

  return api;
}
