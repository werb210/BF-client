import { env } from "@/config/env";

export async function waitForReady(retries = 20, delayMs = 500): Promise<void> {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(`${env.API_URL}/ready`);
      if (res.status === 200) return;
    } catch {
      // ignore and retry
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("API_NOT_READY");
}
