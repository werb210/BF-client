// BF_CLIENT_BLOCK_v165_MAYA_AUDIENCE_HEADER_v1
// Secondary Maya client used by MayaClientChat. Same audience
// contract as client-app/src/api/maya.ts. Kept in lockstep so
// any Maya call from BF-client carries audience=client.
import { apiCall } from "@/lib/api";

const MAYA_HEADERS: HeadersInit = {
  "X-Maya-Audience": "client",
  "Content-Type": "application/json",
};

export async function sendMessageToMaya(message: string) {
  const res = await apiCall("/api/maya/message", {
    method: "POST",
    body: JSON.stringify({ message }),
    headers: MAYA_HEADERS,
  });
  return res;
}

export async function escalateMayaChat() {
  const res = await apiCall("/api/maya/escalate", {
    method: "POST",
    headers: MAYA_HEADERS,
  });
  return res;
}

export async function joinStartupWaitlist(data: { name: string; email: string; phone: string }) {
  const res = await apiCall("/api/crm/startup-waitlist", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res;
}
