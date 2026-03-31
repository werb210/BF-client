import { apiRequest } from "@/lib/api";

export async function chatMaya(message: string) {
  return apiRequest<{ reply?: string }>("/maya/chat", {
    method: "POST",
    body: { message },
  });
}
