import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";

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

export function createHttpClient(config: AxiosRequestConfig): AxiosInstance {
  const client = axios.create({
    withCredentials: true,
    validateStatus: (status) => status < 500,
    ...config,
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        const status = error.response.status;
        const message = `Request failed with status ${status}`;
        throw new ApiError(message, status, error.response.data);
      }

      throw error;
    }
  );

  return client;
}
