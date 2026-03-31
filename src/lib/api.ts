import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function apiRequest(
  path: string,
  options: { method?: "GET"|"POST"|"PUT"|"DELETE"; body?: any } = {}
) {
  const res = await api.request({
    url: path,
    method: options.method || "GET",
    data: options.body,
  });

  return res.data;
}
