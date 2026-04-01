export function logError(msg: unknown, ...meta: unknown[]) {
  if (process.env.NODE_ENV === "test") return
  console.error(msg, ...meta)
}

export function logClientError(msg: unknown, ...meta: unknown[]) {
  logError(msg, ...meta)
}

export function logClientWarning(msg: unknown, ...meta: unknown[]) {
  if (process.env.NODE_ENV === "test") return
  console.warn(msg, ...meta)
}
