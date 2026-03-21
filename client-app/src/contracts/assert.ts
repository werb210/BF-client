export function assertContract(value: any, name: string) {
  if (!value) {
    throw new Error(`Missing contract value: ${name}`);
  }
}
