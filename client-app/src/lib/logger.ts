function toError(message: string, detail?: unknown): Error {
  if (detail instanceof Error) return detail;
  const suffix = typeof detail === "string" ? `: ${detail}` : "";
  return new Error(`${message}${suffix}`);
}

export function logClientError(messageOrError: string | unknown, detail?: unknown) {
  const message = typeof messageOrError === "string" ? messageOrError : "Client error";
  const resolvedDetail = typeof messageOrError === "string" ? detail : messageOrError;
  if (typeof globalThis.reportError === "function") {
    globalThis.reportError(toError(message, resolvedDetail));
  }
}

export function logClientWarning(message: string, detail?: unknown) {
  if (typeof globalThis.reportError === "function") {
    globalThis.reportError(toError(`Warning: ${message}`, detail));
  }
}
