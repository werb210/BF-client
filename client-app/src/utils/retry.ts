export type RetryOptions = {
  attempts?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  { attempts = 3, delayMs = 500, shouldRetry }: RetryOptions = {}
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const nextAttempt = i + 1;
      const canRetry = nextAttempt < attempts;
      if (!canRetry || shouldRetry?.(error, nextAttempt) === false) {
        break;
      }
      await sleep(delayMs);
    }
  }

  const error = new Error("FAILED_AFTER_RETRY");
  (error as Error & { cause?: unknown }).cause = lastError;
  throw error;
}
