// BF_CLIENT_BLOCK_v165_MAYA_AUDIENCE_HEADER_v1
// Every Maya request from the BF-client mini-portal advertises
// audience=client so the agent service applies the client tool
// whitelist (application.my_status, docs.checklist,
// pgi.completion_link, book.callback).
// See AGENT_BLOCK_v2_AUDIENCE_AND_STAFF_PIPELINE_TOOL_v1.
import { apiRequest } from "@/lib/api";

const MAYA_HEADERS: HeadersInit = {
  "X-Maya-Audience": "client",
  "Content-Type": "application/json",
};

export async function sendMayaMessage(message: string) {
  return apiRequest("/api/maya/message", {
    method: "POST",
    body: { message },
    headers: MAYA_HEADERS,
  });
}
