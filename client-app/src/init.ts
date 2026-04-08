import { env } from "@/config/env";

export async function waitForServer() {
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`${env.API_URL}/ready`);
      if (res.ok) return;
    } catch {}

    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error("SERVER_NOT_READY");
}
