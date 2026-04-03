import api from "./client";

export async function getVoiceToken() {
  const res = await api.get<{ token?: string }>("/api/v1/voice/token");
  const { data } = res;
  const token = data?.token;

  if (!token) throw new Error("Missing telephony token");

  return token;
}
