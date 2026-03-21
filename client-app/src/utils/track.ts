import { apiRequest } from "@/api/client";
import { API_CONTRACT } from "@/contracts";

export function track(event: string, metadata?: unknown): void {
  void apiRequest(API_CONTRACT.SUPPORT_EVENT, {
    method: "POST",
    body: JSON.stringify({ event, metadata, source: "client_app" }),
  }).catch(() => undefined);
}
