import { api } from "../lib/api";

export async function getVoiceToken() {
  const res = await api.get<{ token?: string }>("/telephony/token");
  const token = res.data?.token;

  if (!token) throw new Error("Missing telephony token");

  return token;
}
