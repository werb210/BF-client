import { apiRequest } from "../api/client";
import { getToken } from "@/auth/tokenStorage";

export async function createApplication(data: unknown) {
  return apiRequest("/api/application", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateApplication(data: unknown) {
  if (!getToken()) return;

  return apiRequest("/api/application/update", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getContinuation() {
  return apiRequest("/api/application/continuation");
}
