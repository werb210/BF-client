export async function handleResponse(res: Response) {
  if (!res.ok) {
    let error;
    try {
      error = await res.json();
    } catch {
      error = { message: "Unknown error" };
    }
    throw new Error(error.message || "Request failed");
  }

  return res.json();
}
