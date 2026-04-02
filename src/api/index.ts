import { apiFetch } from "./client";
import { API_BASE_URL } from "./config";

export function post(path: string, body: any, headers: any = {}) {
  return apiFetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export function get(path: string, headers: any = {}) {
  return apiFetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers,
  });
}
