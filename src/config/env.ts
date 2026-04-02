import { z } from "zod";

const schema = z.object({
  VITE_API_URL: z.string().url(),
});

let cached: z.infer<typeof schema> | null = null;

export function getEnv() {
  if (!cached) {
    const raw = {
      VITE_API_URL:
        import.meta.env.VITE_API_URL ||
        (import.meta.env.MODE === "test"
          ? "http://localhost:3000"
          : undefined),
    };

    cached = schema.parse(raw);
  }
  return cached;
}
