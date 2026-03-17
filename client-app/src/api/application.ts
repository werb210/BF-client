import { apiRequest } from "./client";
import { getToken } from "@/auth/tokenStorage";

export function createApplication(data: any) {
  return apiRequest("/api/application", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateApplication(data: any) {
  if (!getToken()) return;

  return apiRequest("/api/application/update", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getContinuation() {
  return apiRequest("/api/application/continuation");
}
