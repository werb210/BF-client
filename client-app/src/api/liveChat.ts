import api from "@/api/client";

export async function escalateToHuman() {
  await api.post("/api/ai/escalate");
}
