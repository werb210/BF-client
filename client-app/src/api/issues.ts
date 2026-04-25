import { apiRequest } from "@/lib/api";

export async function submitIssueReport(payload: {
  message: string;
  screenshotBase64?: string;
}) {
  // After BF-Server block 4: POST /api/client/issues persists to
  // client_issues table. Server returns {status:"ok", data:{id, received:true}}.
  return apiRequest("/api/client/issues", {
    method: "POST",
    body: payload,
  });
}
