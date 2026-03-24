import { apiRequest } from "@/lib/api";

export async function sendMessageToMaya(message: string) {
  const res = await apiRequest("/maya/client-chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  return res;
}

export async function escalateMayaChat() {
  const res = await apiRequest("/maya/escalate", { method: "POST" });
  return res;
}

export async function joinStartupWaitlist(data: { name: string; email: string; phone: string }) {
  const res = await apiRequest("/crm/startup-waitlist", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res;
}
