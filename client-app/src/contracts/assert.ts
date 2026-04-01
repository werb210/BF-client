export function assertContract(value: unknown, name: string) {
  if (!value) {
    throw new Error(`Missing contract value: ${name}`);
  }
}
