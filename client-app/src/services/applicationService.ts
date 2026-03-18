import { apiRequest } from "../api/client";
import { hasToken } from "@/lib/auth";

export async function createApplication(data: unknown) {
  return apiRequest("/api/application", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateApplication(data: unknown) {
  if (!hasToken()) return;

  return apiRequest("/api/application/update", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getContinuation() {
  return apiRequest("/api/application/continuation");
}
