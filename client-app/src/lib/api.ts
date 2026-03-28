import axios from "axios";
import { assertApiResponse } from "./assertApiResponse";
import { getToken } from "./auth";

const BASE_URL = "https://server.boreal.financial";

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (!token) {
    throw new Error("Missing auth token");
  }

  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  } as any;

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

const request = async (path: string, options: RequestInit & { data?: unknown } = {}) => {
  const body = options.data ?? options.body;
  const { data } = await api.request({
    url: path,
    method: options.method,
    headers: options.headers as any,
    data: body,
  });

  return assertApiResponse(data);
};

const apiRequest = <T = unknown>(path: string, options: RequestInit & { data?: unknown } = {}) =>
  request(path, options) as Promise<T>;

const buildUrl = (path: string): string => `${BASE_URL}${path}`;

export default api;
export { api, request, apiRequest, buildUrl };
