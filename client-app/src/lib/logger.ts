export function logError(err: unknown, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test") return

  console.error("[CLIENT_ERROR]", {
    err: err instanceof Error ? err.message : err,
    context,
  })
}

export function logClientError(messageOrError: string | unknown, detail?: unknown) {
  if (typeof messageOrError === "string") {
    logError(new Error(messageOrError), detail as Record<string, unknown> | undefined)
    return
  }

  logError(messageOrError, detail as Record<string, unknown> | undefined)
}

export function logClientWarning(message: string, detail?: unknown) {
  logError(new Error(`Warning: ${message}`), detail as Record<string, unknown> | undefined)
}
