import { api } from "@/lib/api";

export async function submitApplication(payload: any) {
  return api("/v1/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
