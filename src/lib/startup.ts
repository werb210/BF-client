const API_URL = import.meta.env.VITE_API_URL;

export async function checkReadiness(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/health`);

    if (!res.ok) return false;

    const json = await res.json();

    return json?.status === "ok";
  } catch {
    return false;
  }
}
