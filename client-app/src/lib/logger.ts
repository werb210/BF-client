export function logError(msg: unknown) {
  if (process.env.NODE_ENV === "test") return
  console.error(msg)
}

export function logClientError(msg: unknown) {
  logError(msg)
}
