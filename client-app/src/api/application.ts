import { apiRequest } from "./client";
import { hasToken } from "@/lib/auth";

export function createApplication(data: any) {
  return apiRequest("/api/application", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateApplication(data: any) {
  if (!hasToken()) return;

  return apiRequest("/api/application/update", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getContinuation() {
  return apiRequest("/api/application/continuation");
}
