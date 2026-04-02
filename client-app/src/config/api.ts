let cached: string | null = null;

export function getApiBase(): string {
  if (cached) return cached;

  const base =
    import.meta.env.VITE_API_URL ||
    process.env.VITE_API_URL;

  if (!base) {
    throw new Error("VITE_API_URL missing");
  }

  cached = base;
  return base;
}
