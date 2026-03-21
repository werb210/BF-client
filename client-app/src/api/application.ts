import { apiRequest } from "./client";
import { API_CONTRACT } from "@/contracts";
import { hasToken } from "@/lib/auth";

export function createApplication(data: any) {
  return apiRequest(API_CONTRACT.APPLICATION.ROOT, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateApplication(data: any) {
  if (!hasToken()) return;

  return apiRequest(API_CONTRACT.APPLICATION.UPDATE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getContinuation() {
  return apiRequest(API_CONTRACT.APPLICATION.CONTINUATION);
}
