export async function handleApi<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (err) {
    console.error("API ERROR:", err);
    throw err;
  }
}
