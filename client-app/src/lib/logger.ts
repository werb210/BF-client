export function logError(err: unknown, context?: any) {
  console.error("[CLIENT_ERROR]", {
    err,
    context,
    timestamp: new Date().toISOString(),
  })
}

export function logClientError(messageOrError: string | unknown, detail?: unknown) {
  if (typeof messageOrError === "string") {
    logError(new Error(messageOrError), detail)
    return
  }

  logError(messageOrError, detail)
}

export function logClientWarning(message: string, detail?: unknown) {
  logError(new Error(`Warning: ${message}`), detail)
}
