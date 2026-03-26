import { apiFetch } from "../lib/apiFetch";

export async function getVoiceToken() {
  const res = await apiFetch<{ token?: string }>("/telephony/token");

  if (!res.token) throw new Error("Missing telephony token");

  return res.token;
}
