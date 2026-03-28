import axios from "axios";

const API_BASE_URL = "https://server.boreal.financial";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    } as any;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API ERROR:", error?.response || error.message);
    return Promise.reject(error);
  }
);

export default api;
export { api };

export const request = async (path: string, options: RequestInit & { data?: unknown } = {}) => {
  const body = options.data ?? options.body;
  const { data } = await api.request({
    url: path,
    method: options.method,
    headers: options.headers as any,
    data: body,
  });
  return data;
};

export const apiRequest = <T = unknown>(path: string, options: RequestInit & { data?: unknown } = {}) =>
  request(path, options) as Promise<T>;

export const buildUrl = (path: string): string => `${API_BASE_URL}${path}`;
