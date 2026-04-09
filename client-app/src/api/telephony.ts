import api from "./client";
import { endpoints } from "@/lib/endpoints";

export async function getVoiceToken(): Promise<string> {
  const res = await api.get<{ token?: string }>(endpoints.voiceToken);
  const token = res.data?.token;

  if (!token) {
    throw new Error("Missing telephony token");
  }

  return token;
}
