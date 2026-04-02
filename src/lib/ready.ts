import { env } from "@/config/env";

export async function waitForReady(retries = 10, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${env.API_URL}/ready`);
      if (res.status === 200) return;
    } catch {}

    await new Promise((r) => setTimeout(r, delay));
  }

  throw new Error("API_NOT_READY");
}
