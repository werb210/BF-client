export function getRequestId() {
  return `rid-${Math.random().toString(36).slice(2, 10)}`;
}
