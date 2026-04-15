import { apiRequest } from "@/lib/api";

export async function submitIssueReport(payload: {
  message: string;
  screenshotBase64?: string;
}) {
  return apiRequest("/api/client/issues", {
    method: "POST",
    body: payload,
  });
}
