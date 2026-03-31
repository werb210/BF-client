export async function apiRequest(
  path: string,
  options: {
    method?: string;
    body?: any;
  } = {}
) {
  const res = await fetch(`/api${path}`, { // apiRequest
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
